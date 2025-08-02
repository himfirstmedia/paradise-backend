import axios, { AxiosError } from 'axios';
import prisma from 'config/prisma';
import { task_status, user_role } from '@prisma/client';

interface NotificationPayload {
  to: string | string[]; // Support single token or array for batch
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string; // Optional sound field
}

interface PartialNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string; // Optional sound field
}

interface ExpoResponse {
  data: Array<{ status: string; details?: { error?: string } }>;
  errors?: any[];
}

async function sendExpoNotification(payload: NotificationPayload, retries = 3, retryDelay = 1000): Promise<ExpoResponse | null> {
  // Normalize payload to always be an array for batch support
  const messages = Array.isArray(payload.to)
    ? payload.to.map(to => ({
        to,
        sound: payload.sound || 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }))
    : [{
        to: payload.to,
        sound: payload.sound || 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }];

  let attempt = 0;
  while (attempt < retries) {
    try {
      console.log(`Sending push notification (attempt ${attempt + 1}/${retries}):`, JSON.stringify(messages, null, 2));
      
      const response = await axios.post<ExpoResponse>(
        'https://exp.host/--/api/v2/push/send',
        messages,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log('Expo push response:', JSON.stringify(response.data, null, 2));

      if (response.data.errors) {
        console.error('Expo push errors:', JSON.stringify(response.data.errors, null, 2));
      }

      if (response.data.data) {
        const invalidTokens: string[] = [];
        response.data.data.forEach((result, index) => {
          if (result.status === 'error' && result.details?.error === 'DeviceNotRegistered') {
            const token = Array.isArray(payload.to) ? payload.to[index] : payload.to;
            if (typeof token === 'string') {
              invalidTokens.push(token);
            }
          }
        });

        if (invalidTokens.length > 0) {
          console.log('Removing invalid push tokens:', invalidTokens);
          await prisma.user.updateMany({
            where: { expoPushToken: { in: invalidTokens } },
            data: { expoPushToken: null },
          });
        }
      }

      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      attempt++;
      console.error(`Push notification failed (attempt ${attempt}/${retries}):`, error.response?.data || error.message);

      if (attempt < retries) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      console.error('Max retries reached. Notification failed.');
      return null;
    }
  }

  return null;
}

const notifyUserById = async (userId: number, payload: PartialNotificationPayload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });

  if (user?.expoPushToken) {
    console.log(`Notifying user ${userId} with token: ${user.expoPushToken}`);
    await sendExpoNotification({ ...payload, to: user.expoPushToken });
  } else {
    console.log(`No push token found for user ${userId}`);
  }
};

const notifyHouseManagers = async (houseId: number, payload: PartialNotificationPayload) => {
  const managers = await prisma.user.findMany({
    where: {
      role: {
        in: ['RESIDENT_MANAGER', 'FACILITY_MANAGER'],
      },
      assignments: {
        some: {
          houseId,
        },
      },
      expoPushToken: {
        not: null,
      },
    },
    select: { id: true, expoPushToken: true },
  });

  console.log(`Found ${managers.length} managers for houseId ${houseId}:`, managers);
  if (managers.length > 0) {
    const tokens = managers.map(manager => manager.expoPushToken!);
    console.log(`Sending batch notification to managers: ${tokens}`);
    await sendExpoNotification({ ...payload, to: tokens });
  }
};

export const notificationService = {
  notifyTaskStatusChange: async (taskId: number, newStatus: task_status) => {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: true,
        chore: { include: { house: true } },
      },
    });

    if (!task || !task.user || !task.user.expoPushToken) {
      console.log(`Task ${taskId} or user not found, or no push token`);
      return;
    }

    const statusMsg = {
      PENDING: 'has been marked as pending.',
      REVIEWING: 'is under review.',
      APPROVED: 'has been approved 🎉',
      REJECTED: 'was rejected. Please review and resubmit.',
    }[newStatus];

    const message: PartialNotificationPayload = {
      title: 'Task Update',
      body: `Your task "${task.name}" ${statusMsg}`,
      data: { taskId: task.id },
    };

    console.log(`Notifying task ${taskId} status change to ${newStatus}`);
    await notifyUserById(task.userId!, message);

    if (task.chore?.houseId) {
      console.log(`Notifying managers for house ${task.chore.houseId}`);
      await notifyHouseManagers(task.chore.houseId, {
        title: 'Resident Task Update',
        body: `Task "${task.name}" status updated to ${newStatus}`,
        data: { taskId: task.id },
      });
    }
  },

  notifyNewTaskAssigned: async (userId: number, taskName: string) => {
    console.log(`Notifying user ${userId} about new task: ${taskName}`);
    await notifyUserById(userId, {
      title: 'New Task Assigned',
      body: `You have been assigned a new task: "${taskName}"`,
      data: {},
    });
  },

  notifyFeedback: async (taskId: number, fromUserId: number) => {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { user: true },
    });

    if (!task || !task.user) {
      console.log(`Task ${taskId} or user not found`);
      return;
    }

    console.log(`Notifying user ${task.user.id} about feedback on task ${taskId}`);
    await notifyUserById(task.user.id, {
      title: 'Feedback Received',
      body: `You have new feedback on your task: "${task.name}"`,
      data: { taskId },
    });
  },

  notifyChoreUpdate: async (userId: number, choreName: string) => {
    console.log(`Notifying user ${userId} about chore update: ${choreName}`);
    await notifyUserById(userId, {
      title: 'Chore Updated',
      body: `Your chore assignment "${choreName}" has been updated.`,
      data: {},
    });
  },

  notifyNewMessage: async (chatId: number, messageId: number, senderId: number) => {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          chat: {
            include: {
              users: {
                include: {
                  user: {
                    select: { id: true, expoPushToken: true, name: true },
                  },
                },
              },
            },
          },
          sender: { select: { name: true } },
        },
      });

      if (!message || !message.chat) {
        console.log(`Message ${messageId} or chat ${chatId} not found`);
        return;
      }

      const recipients = message.chat.users
        .filter(chatUser => chatUser.user.id !== senderId && chatUser.user.expoPushToken)
        .map(chatUser => chatUser.user);
      console.log(`Notifying ${recipients.length} users for new message in chat ${chatId}`);

      if (recipients.length > 0) {
        const tokens = recipients.map(user => user.expoPushToken!);
        await sendExpoNotification({
          to: tokens,
          title: `New Message from ${message.sender.name}`,
          body: message.content && message.content.length > 50
            ? `${message.content.slice(0, 47)}...`
            : message.content || 'New image message',
          data: { chatId, messageId },
        });
      }
    } catch (error) {
      console.error('Error notifying new message:', error);
    }
  },

  notifyAddedToChat: async (userId: number, chatId: number) => {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { name: true, isGroup: true },
      });

      if (!chat) {
        console.log(`Chat ${chatId} not found`);
        return;
      }

      console.log(`Notifying user ${userId} about being added to chat ${chatId}`);
      await notifyUserById(userId, {
        title: 'Added to Chat',
        body: `You have been added to ${chat.isGroup ? 'group' : 'a'} chat: "${chat.name || 'Chat'}"`,
        data: { chatId },
      });
    } catch (error) {
      console.error('Error notifying user added to chat:', error);
    }
  },
};
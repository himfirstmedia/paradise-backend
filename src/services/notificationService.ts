import fetch from 'node-fetch';
import prisma from 'config/prisma';
import { task_status, user_role } from '@prisma/client';

interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendPush = async (message: NotificationPayload) => {
  try {
    console.log('Sending push notification:', message);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();
    console.log('Expo push response:', JSON.stringify(data, null, 2));
    if (data.errors) {
      console.error('Expo push errors:', data.errors);
    }
    if (data.data && data.data[0]?.status === 'error') {
      console.error('Push notification error details:', data.data[0]);
      if (data.data[0]?.details?.error === 'DeviceNotRegistered') {
        console.log('Removing invalid push token:', message.to);
        await prisma.user.updateMany({
          where: { expoPushToken: message.to },
          data: { expoPushToken: null },
        });
      }
    }
    return data;
  } catch (err) {
    console.error('Push notification failed:', err);
    return null;
  }
};

const notifyUserById = async (userId: number, payload: Omit<NotificationPayload, 'to'>) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });

  if (user?.expoPushToken) {
    console.log(`Notifying user ${userId} with token: ${user.expoPushToken}`);
    await sendPush({ to: user.expoPushToken, ...payload });
  } else {
    console.log(`No push token found for user ${userId}`);
  }
};

const notifyHouseManagers = async (houseId: number, payload: Omit<NotificationPayload, 'to'>) => {
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
  for (const manager of managers) {
    console.log(`Sending notification to manager ${manager.id}`);
    await sendPush({ to: manager.expoPushToken!, ...payload });
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

    const message = {
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

      for (const user of recipients) {
        await sendPush({
          to: user.expoPushToken!,
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
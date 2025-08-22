import axios, { AxiosError } from 'axios';
import prisma from 'config/prisma';
import { Chore_Status } from '@prisma/client';

interface NotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
}

interface PartialNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
}

interface ExpoResponse {
  data: Array<{ status: string; details?: { error?: string } }>;
  errors?: any[];
}

async function sendExpoNotification(payload: NotificationPayload, retries = 3, retryDelay = 1000): Promise<ExpoResponse | null> {
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

const notifyHouseManagers = async (houseId: number, payload: PartialNotificationPayload) => {
  const managers = await prisma.user.findMany({
    where: {
      role: {
        in: ['MANAGER'],
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
  notifyUserById: async (userId: number, payload: PartialNotificationPayload) => {
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
  },

  notifyTaskStatusChange: async (choreId: number, newStatus: Chore_Status) => {
    try {
      const chore = await prisma.chore.findUnique({
        where: { id: choreId },
        select: {
          id: true,
          name: true,
          user: { select: { id: true, expoPushToken: true } },
          houseId: true, // Corrected field name
        },
      });

      if (!chore) {
        console.log(`Chore ${choreId} not found`);
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
        body: `Your task "${chore.name}" ${statusMsg}`,
        data: { choreId: chore.id },
      };

      console.log(`Notifying chore ${choreId} status change to ${newStatus}`);
      
      // Notify assigned user
      if (chore.user?.expoPushToken) {
        await sendExpoNotification({
          ...message,
          to: chore.user.expoPushToken
        });
      }

      // Notify house managers
      if (chore.houseId) {
        console.log(`Notifying managers for house ${chore.houseId}`);
        await notifyHouseManagers(chore.houseId, {
          title: 'Resident Task Update',
          body: `Task "${chore.name}" status updated to ${newStatus}`,
          data: { choreId: chore.id },
        });
      }
    } catch (error) {
      console.error('Error in notifyTaskStatusChange:', error);
    }
  },

  notifyNewTaskAssigned: async (userId: number, choreName: string) => {
    console.log(`Notifying user ${userId} about new task: ${choreName}`);
    await notificationService.notifyUserById(userId, {
      title: 'New Task Assigned',
      body: `You have been assigned a new task: "${choreName}"`,
      data: {},
    });
  },

  notifyFeedback: async (choreId: number, fromUserId: number) => {
    try {
      const chore = await prisma.chore.findUnique({
        where: { id: choreId },
        include: { user: true },
      });

      if (!chore?.user) {
        console.log(`Chore ${choreId} has no assigned user`);
        return;
      }

      console.log(`Notifying user ${chore.user.id} about feedback on chore ${choreId}`);
      await notificationService.notifyUserById(chore.user.id, {
        title: 'Feedback Received',
        body: `You have new feedback on your chore: "${chore.name}"`,
        data: { choreId },
      });
    } catch (error) {
      console.error('Error in notifyFeedback:', error);
    }
  },

  notifyChoreUpdate: async (userId: number, choreName: string) => {
    console.log(`Notifying user ${userId} about chore update: ${choreName}`);
    await notificationService.notifyUserById(userId, {
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
            house: { select: { id: true } },
          },
        },
        sender: { select: { name: true } },
      },
    });

    if (!message || !message.chat) {
      console.log(`Message ${messageId} or chat ${chatId} not found`);
      return;
    }

    // 1. Notify direct chat participants
    const directRecipients = message.chat.users
      .filter(chatUser => chatUser.user.id !== senderId && chatUser.user.expoPushToken)
      .map(chatUser => chatUser.user);

    console.log(`Notifying ${directRecipients.length} direct users for new message in chat ${chatId}`);

    // 2. Notify house managers if chat is associated with a house
    let managerRecipients: any[] = [];
    if (message.chat.house?.id) {
      const managers = await prisma.user.findMany({
        where: {
          role: 'MANAGER',
          assignments: { some: { houseId: message.chat.house.id } },
          expoPushToken: { not: null },
          id: { not: senderId }, // Exclude sender
          NOT: { 
            id: { in: directRecipients.map(u => u.id) } // Exclude direct participants
          }
        },
        select: { id: true, expoPushToken: true, name: true },
      });
      managerRecipients = managers;
      console.log(`Found ${managerRecipients.length} managers to notify for house ${message.chat.house.id}`);
    }

    // Combine both recipient lists
    const allRecipients = [...directRecipients, ...managerRecipients];
    const uniqueRecipients = allRecipients.filter(
      (v, i, a) => a.findIndex(t => t.id === v.id) === i
    );

    if (uniqueRecipients.length > 0) {
      const tokens = uniqueRecipients.map(user => user.expoPushToken!);
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
      await notificationService.notifyUserById(userId, {
        title: 'Added to Chat',
        body: `You have been added to ${chat.isGroup ? 'group' : 'a'} chat: "${chat.name || 'Chat'}"`,
        data: { chatId },
      });
    } catch (error) {
      console.error('Error notifying user added to chat:', error);
    }
  },
};
import fetch from 'node-fetch';
import prisma from 'config/prisma';
import { task_status, user_role } from '@prisma/client';

interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

const sendPush = async (message: NotificationPayload) => {
  try {
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
    if (data.errors) {
      console.error("Expo push error", data.errors);
    }
  } catch (err) {
    console.error("Push notification failed:", err);
  }
};

const notifyUserById = async (userId: number, payload: Omit<NotificationPayload, 'to'>) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });

  if (user?.expoPushToken) {
    await sendPush({ to: user.expoPushToken, ...payload });
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
    select: { expoPushToken: true },
  });

  for (const manager of managers) {
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

    if (!task || !task.user || !task.user.expoPushToken) return;

    const statusMsg = {
      PENDING: 'has been marked as pending.',
      REVIEWING: 'is under review.',
      APPROVED: 'has been approved 🎉',
      REJECTED: 'was rejected. Please review and resubmit.',
    }[newStatus];

    const message = {
      title: "Task Update",
      body: `Your task "${task.name}" ${statusMsg}`,
      data: { taskId: task.id },
    };

    // Notify task owner
    await notifyUserById(task.userId!, message);

    // Notify house managers
    if (task.chore?.houseId) {
      await notifyHouseManagers(task.chore.houseId, {
        title: "Resident Task Update",
        body: `Task "${task.name}" status updated to ${newStatus}`,
        data: { taskId: task.id },
      });
    }
  },

  notifyNewTaskAssigned: async (userId: number, taskName: string) => {
    await notifyUserById(userId, {
      title: "New Task Assigned",
      body: `You have been assigned a new task: "${taskName}"`,
      data: {},
    });
  },

  notifyFeedback: async (taskId: number, fromUserId: number) => {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { user: true },
    });

    if (!task || !task.user) return;

    await notifyUserById(task.user.id, {
      title: "Feedback Received",
      body: `You have new feedback on your task: "${task.name}"`,
      data: { taskId },
    });
  },

  notifyChoreUpdate: async (userId: number, choreName: string) => {
    await notifyUserById(userId, {
      title: "Chore Updated",
      body: `Your chore assignment "${choreName}" has been updated.`,
      data: {},
    });
  },
};

import { Request, Response } from 'express';
import { taskService } from '../services/taskService';
import { task_category, task_status } from "@prisma/client";
import { upload } from 'middlewares/upload';
import fs from "fs";
import path from "path";
import dayjs from 'dayjs';
import prisma from 'config/prisma';
import { notificationService } from '../services/notificationService';
import cloudinary from 'config/cloudinary';

export const taskController = {
  create: async (req: Request, res: Response) => {
    try {
      const {
        name,
        startDate,
        endDate,
        description,
        progress,
        status,
        category,
        instruction,
        userId,
        choreId,
      } = req.body;

      const validCategory = Object.values(task_category).includes(category)
        ? (category as task_category)
        : undefined;

      const validStatus = Object.values(task_status).includes(status)
        ? (status as task_status)
        : undefined;

      const task = await taskService.create({
        name,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        description,
        instruction,
        progress,
        category: validCategory,
        status: validStatus,
        user: userId
          ? {
              connect: {
                id: Number(userId),
              },
            }
          : undefined,
        chore: choreId
          ? {
              connect: {
                id: Number(choreId),
              },
            }
          : undefined,
      });

      // Notify the assigned user about the new task
      if (userId && task.name) {
        try {
          await notificationService.notifyNewTaskAssigned(Number(userId), task.name);
        } catch (notificationError) {
          console.error(`Failed to notify user ${userId} for task ${task.name}:`, notificationError);
        }
      }

      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while creating the task.",
      });
    }
  },

  findAll: async (_: Request, res: Response) => {
    try {
      const tasks = await taskService.findAll();
      res.json(tasks);
    } catch (error: any) {
      console.error("Fetch tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  },

  findById: async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task id" });
      }

      const task = await taskService.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error: any) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  },

  update: async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task id" });
    }

    try {
      const {
        name,
        startDate,
        endDate,
        description,
        progress,
        status,
        category,
        instruction,
        userId,
      } = req.body;

      const validCategory = Object.values(task_category).includes(category)
        ? (category as task_category)
        : undefined;

      const validStatus = Object.values(task_status).includes(status)
        ? (status as task_status)
        : undefined;

      const imageUrl = req.file ? (req.file as any).path : undefined;
      const cloudinaryId = req.file ? (req.file as any).filename : undefined;

      const existingTask = await taskService.findById(id);

      const updateData: any = {
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        description,
        progress,
        instruction,
        category: validCategory,
        status: validStatus,
        userId: userId ? Number(userId) : undefined,
      };

      if (imageUrl) {
        updateData.image = imageUrl;
        updateData.cloudinaryId = cloudinaryId;
      }

      // Remove image if task is rejected (status and progress both PENDING)
      const isRejection =
        validStatus === "PENDING" && progress?.toUpperCase() === "PENDING";

      if (isRejection && existingTask.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(existingTask.cloudinaryId);
        } catch (err) {
          console.warn("Failed to delete Cloudinary image:", (err as Error).message);
        }
        updateData.image = null;
        updateData.cloudinaryId = null;
      }

      // Update the task
      const updatedTask = await taskService.update(id, updateData);

      // Notify about task status change
      if (validStatus && validStatus !== existingTask.status) {
        try {
          await notificationService.notifyTaskStatusChange(id, validStatus);
        } catch (notificationError) {
          console.error(`Failed to notify task status change for task ${id}:`, notificationError);
        }
      }

      // Notify about feedback if instruction or description changed
      if (
        (instruction && instruction !== existingTask.instruction) ||
        (description && description !== existingTask.description)
      ) {
        try {
          await notificationService.notifyFeedback(id, existingTask.userId || Number(userId));
        } catch (notificationError) {
          console.error(`Failed to send feedback notification for task ${id}:`, notificationError);
        }
      }

      // If both choreId and userId exist, set user's currentChoreId
if (userId && existingTask.choreId) {
  try {
    // Check if chore is already assigned to another user
    const existingUserWithChore = await prisma.user.findFirst({
      where: { currentChoreId: existingTask.choreId, id: { not: Number(userId) } },
      select: { id: true },
    });
    if (existingUserWithChore) {
      console.warn(`Chore ${existingTask.choreId} is already assigned to user ${existingUserWithChore.id}`);
    } else {
      await prisma.user.update({
        where: { id: Number(userId) },
        data: { currentChoreId: existingTask.choreId },
      });

      // Notify user about chore update
      const chore = await prisma.chore.findUnique({
        where: { id: existingTask.choreId },
      });
      if (chore && chore.name) {
        try {
          await notificationService.notifyChoreUpdate(Number(userId), chore.name);
        } catch (notificationError) {
          console.error(`Failed to notify chore update for user ${userId}:`, notificationError);
        }
      }
    }
  } catch (choreError) {
    console.error(`Failed to update chore for user ${userId}:`, choreError);
  }
}

      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(500).json({
        message: error?.message || "Failed to update task.",
      });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "Invalid task id" });
      }

      // Fetch task to get userId and task name for notification
      const task = await taskService.findById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      await taskService.delete(taskId);

      // Notify the assigned user, if any
      if (task.userId && task.name) {
        try {
          await notificationService.notifyUserById(task.userId, {
            title: "Task Deleted",
            body: `Your task "${task.name}" has been deleted.`,
            data: { taskId },
          });
        } catch (notificationError) {
          console.error(`Failed to notify user ${task.userId} for task deletion ${taskId}:`, notificationError);
        }
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting task:", error);
      res.status(500).json({
        message: error?.message || "Failed to delete task.",
      });
    }
  },

  submitWithImage: [
    upload("tasks").single("image"),
    async (req: Request, res: Response) => {
      try {
        const id = Number(req.params.id);
        const imagePath = req.file ? `/uploads/tasks/${req.file.filename}` : undefined;

        const task = await taskService.update(id, {
          status: 'REVIEWING',
          image: imagePath,
        });

        // Notify about task status change to REVIEWING
        try {
          await notificationService.notifyTaskStatusChange(id, 'REVIEWING');
        } catch (notificationError) {
          console.error(`Failed to notify task status change for task ${id}:`, notificationError);
        }

        res.json(task);
      } catch (error: any) {
        console.error('Error submitting task with image:', error);
        res.status(500).json({ message: error.message });
      }
    },
  ],

  getTaskSummary: async (req: Request, res: Response) => {
    try {
      const userId = Number(req.query.userId);
      console.log(`[getTaskSummary] Called with userId: ${userId}`);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      const now = dayjs();
      const today = now.toDate();
      console.log(`[getTaskSummary] Current date: ${today}`);

      let userWorkPeriod = await prisma.userWorkPeriod.findFirst({
        where: {
          userId,
          workPeriod: {
            startDate: { lte: today },
            endDate: { gte: today },
          },
        },
        include: { workPeriod: true },
      });

      if (!userWorkPeriod) {
        console.log(`[getTaskSummary] No userWorkPeriod found. Checking via house.`);
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            house: {
              include: {
                workPeriod: true,
              },
            },
          },
        });

        console.log(`[DEBUG] User ${userId} data:`, JSON.stringify(user, null, 2));

        if (!user) {
          console.warn(`[getTaskSummary] User not found: ${userId}`);
          return res.status(404).json({ message: "User not found" });
        }

        if (!user.house) {
          console.warn(`[getTaskSummary] User ${userId} has no house assigned. HouseId: ${user.houseId}`);
          return res.status(400).json({
            message: "User has no house assignment",
            details: `User record shows houseId: ${user.houseId} but no linked house`,
          });
        }

        console.log(`[DEBUG] House found: ${user.house.id} with workPeriod:`, 
                    user.house.workPeriod ? user.house.workPeriod.id : 'null');

        if (!user.house.workPeriod) {
          console.warn(`[getTaskSummary] House ${user.house.id} has no workPeriod`);
          return res.status(404).json({
            message: "House has no work period configured",
            details: `Configure work period for house ${user.house.id} first`,
          });
        }

        const houseWorkPeriod = user.house.workPeriod;
        const isActive =
          dayjs(houseWorkPeriod.startDate).isBefore(now) &&
          dayjs(houseWorkPeriod.endDate).isAfter(now);

        if (!isActive) {
          console.warn(`[getTaskSummary] House workPeriod is not active today.`);
          return res.status(404).json({ message: "No active work period found" });
        }

        console.log(`[getTaskSummary] Creating userWorkPeriod for user ${userId} based on house workPeriod ${houseWorkPeriod.id}`);

        userWorkPeriod = await prisma.userWorkPeriod.create({
          data: {
            userId,
            workPeriodId: houseWorkPeriod.id,
            carryOverMinutes: 0,
            requiredMinutes: 0,
            completedMinutes: 0,
          },
          include: { workPeriod: true },
        });
      }

      const workPeriod = userWorkPeriod.workPeriod;

      const weekStart = now.startOf('week').toDate();
      const weekEnd = now.endOf('week').toDate();
      const monthStart = now.startOf('month').toDate();

      const daysPassedInPeriod = Math.max(1, Math.min(
        now.diff(dayjs(workPeriod.startDate), 'day') + 1,
        dayjs(workPeriod.endDate).diff(dayjs(workPeriod.startDate), 'day') + 1
      ));

      const aggregateHours = async (start: Date, end: Date) => {
        const result = await prisma.taskLog.aggregate({
          where: {
            userId,
            date: { gte: start, lte: end },
          },
          _sum: { minutes: true },
        });
        return (result._sum.minutes || 0) / 60;
      };

      const weekHours = await aggregateHours(weekStart, weekEnd);
      const monthHours = await aggregateHours(monthStart, today);
      const periodHours = await aggregateHours(workPeriod.startDate, today);

      const expectedMinutesToDate = daysPassedInPeriod * 60;
      const netMinutes = userWorkPeriod.carryOverMinutes + periodHours * 60 - expectedMinutesToDate;

      const beginningBalance = userWorkPeriod.carryOverMinutes / 60;
      const currentBalance = netMinutes / 60;
      const daysRemaining = Math.max(0, dayjs(workPeriod.endDate).diff(now, 'day'));

      const formatBalance = (value: number) => {
        return value >= 0 ? value.toFixed(1) : `-${Math.abs(value).toFixed(1)}`;
      };

      const response = {
        weekStatus: `${weekHours.toFixed(1)} / 7`,
        monthStatus: `${monthHours.toFixed(1)} / ${now.date()}`,
        periodStatus: `${periodHours.toFixed(1)} / ${daysPassedInPeriod}`,
        previousBalance: formatBalance(beginningBalance),
        currentBalance: formatBalance(currentBalance),
        daysRemaining,
        currentPeriod: `${dayjs(workPeriod.endDate).diff(dayjs(workPeriod.startDate), 'day') + 1} days`,
        nextDeadline: dayjs(workPeriod.endDate).format('MMMM D, YYYY'),
        expectedMinutesToDate,
        netMinutes,
      };

      // Notify user if currentBalance is critically low (e.g., less than -7 hours)
      if (currentBalance < -7) {
        try {
          await notificationService.notifyUserById(userId, {
            title: "Task Balance Alert",
            body: `Your task balance is critically low (${formatBalance(currentBalance)} hours). Complete tasks before ${response.nextDeadline}!`,
            data: { userId, workPeriodId: workPeriod.id },
          });
        } catch (notificationError) {
          console.error(`Failed to send balance alert for user ${userId}:`, notificationError);
        }
      }

      console.log(`[getTaskSummary] Final Response:`, response);
      res.json(response);
    } catch (error: any) {
      console.error("❌ Error fetching task summary:", error);
      res.status(500).json({ message: "Failed to fetch task summary." });
    }
  },
};
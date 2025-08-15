import { Request, Response } from "express";
import { choreService } from "../services/choreService";
import prisma from "config/prisma";
import { notificationService } from "services/notificationService";
import dayjs from "dayjs";
import { upload } from "middlewares/upload";
import { Chore_Category, Chore_Status, Prisma } from "@prisma/client";
import cloudinary from "config/cloudinary";
import { log } from "console";

export const choreController = {
  create: async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        status,
        category,
        instruction,
        userId,
        house,
      } = req.body;

      const validCategory = Object.values(Chore_Category).includes(category)
        ? (category as Chore_Category)
        : undefined;

      const validStatus = Object.values(Chore_Status).includes(status)
        ? (status as Chore_Status)
        : undefined;

      const chore = await choreService.create({
        name,
        description,
        instruction,
        category: validCategory,
        status: validStatus,
        user: userId ? { connect: { id: Number(userId) } } : undefined,
        house: house ? { connect: { id: Number(house) } } : undefined,
      });

      if (userId && chore.name) {
        try {
          await notificationService.notifyNewTaskAssigned(Number(userId), chore.name);
        } catch (err) {
          console.error(`Failed to notify user ${userId}:`, err);
        }
      }

      res.status(201).json(chore);
    } catch (error: any) {
      console.error("❌ Error creating chore:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while creating the chore.",
      });
    }
  },

  findAll: async (_: Request, res: Response) => {
    try {
      const chores = await choreService.findAll();
      res.json(chores);
    } catch (error: any) {
      console.error("Error fetching chores:", error);
      res.status(500).json({ message: error.message });
    }
  },

  findById: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid chore ID" });

      const chore = await choreService.findById(id);
      if (!chore) return res.status(404).json({ error: "Chore not found" });

      res.json(chore);
    } catch (error: any) {
      console.error("Error fetching chore by ID:", error);
      res.status(500).json({ message: error.message });
    }
  },

  findDetailedById: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid chore ID" });

      const chore = await choreService.findDetailedById(id);
      if (!chore) return res.status(404).json({ error: "Chore not found" });

      res.json(chore);
    } catch (error: any) {
      console.error("Error fetching detailed chore:", error);
      res.status(500).json({ message: error.message });
    }
  },

  findByHouse: async (req: Request, res: Response) => {
    try {
      const houseId = Number(req.params.houseId);
      if (isNaN(houseId)) return res.status(400).json({ error: "Invalid house ID" });

      const chores = await choreService.findByHouse(houseId);
      res.json(chores);
    } catch (error: any) {
      console.error("Error fetching chores by house:", error);
      res.status(500).json({ message: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid chore ID" });

    try {
      const {
        isPrimary,
        name,
        startDate,
        endDate,
        description,
        status,
        category,
        instruction,
        userId,
        houseId,
      } = req.body;

      const validCategory = Object.values(Chore_Category).includes(category)
        ? (category as Chore_Category)
        : undefined;

      const validStatus = Object.values(Chore_Status).includes(status)
        ? (status as Chore_Status)
        : undefined;

      const imageUrl = req.file ? (req.file as any).path : undefined;
      const cloudinaryId = req.file ? (req.file as any).filename : undefined;

      const existingChore = await choreService.findById(id);

      const updateData: any = {
        isPrimary,
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        description,
        instruction,
        category: validCategory,
        status: validStatus,
        userId: userId ? Number(userId) : undefined,
      };

      if (houseId) updateData.house = { connect: { id: Number(houseId) } };
      if (imageUrl) {
        updateData.image = imageUrl;
        updateData.cloudinaryId = cloudinaryId;
      }

      // Remove image if rejection
      const isRejection =
        validStatus === "PENDING" && status?.toUpperCase() === "PENDING";

      if (isRejection && existingChore.cloudinaryId) {
        await cloudinary.uploader.destroy(existingChore.cloudinaryId);
        updateData.image = null;
        updateData.cloudinaryId = null;
      }

      const updatedChore = await choreService.update(id, updateData);

      if (validStatus && validStatus !== existingChore.status) {
        await notificationService.notifyTaskStatusChange(id, validStatus);
      }

      if (
        (instruction && instruction !== existingChore.instruction) ||
        (description && description !== existingChore.description)
      ) {
        await notificationService.notifyFeedback(id, existingChore.userId || Number(userId));
      }

      // Update user's currentChoreId
      if (userId && existingChore.id) {
        const existingUserWithChore = await prisma.user.findFirst({
          where: { currentChoreId: existingChore.id, id: { not: Number(userId) } },
        });
        if (!existingUserWithChore) {
          await prisma.user.update({
            where: { id: Number(userId) },
            data: { currentChoreId: existingChore.id },
          });
          const chore = await prisma.chore.findUnique({ where: { id: existingChore.id } });
          if (chore?.name) {
            await notificationService.notifyChoreUpdate(Number(userId), chore.name);
          }
        }
      }

      res.json(updatedChore);
    } catch (error: any) {
      console.error("Error updating chore:", error);
      res.status(500).json({ message: error?.message || "Failed to update chore." });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid chore ID" });

      const chore = await choreService.findById(id);
      if (!chore) return res.status(404).json({ message: "Chore not found" });

      await choreService.delete(id);

      if (chore.userId && chore.name) {
        await notificationService.notifyUserById(chore.userId, {
          title: "Chore Deleted",
          body: `Your chore "${chore.name}" has been deleted.`,
          data: { id },
        });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting chore:", error);
      res.status(500).json({ message: error?.message || "Failed to delete chore." });
    }
  },

  submitWithImage: [
    upload("chores").single("image"),
    async (req: Request, res: Response) => {
      try {
        const id = Number(req.params.id);
        const imagePath = req.file ? `/uploads/chores/${req.file.filename}` : undefined;

        const chore = await choreService.update(id, {
          status: "REVIEWING",
          image: imagePath,
        });

        await notificationService.notifyTaskStatusChange(id, "REVIEWING");

        res.json(chore);
      } catch (error: any) {
        console.error("Error submitting chore with image:", error);
        res.status(500).json({ message: error.message });
      }
    },
  ],
 getChoreSummary: async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.userId);
    console.log(`[getChoreSummary] Called with userId: ${userId}`);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const now = dayjs();
    const today = now.toDate();

    // Get user with their period dates
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        periodStart: true,
        periodEnd: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If missing period dates, auto-set a default one (e.g., current month)
    if (!user.periodStart || !user.periodEnd) {
      const startOfMonth = now.startOf("month").toDate();
      const endOfMonth = now.endOf("month").toDate();

      user = await prisma.user.update({
        where: { id: userId },
        data: {
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
        },
        select: {
          id: true,
          name: true,
          role: true,
          periodStart: true,
          periodEnd: true,
        },
      });
    }

    const periodStart = dayjs(user.periodStart);
    const periodEnd = dayjs(user.periodEnd);

    // Check if current date is within the period
    if (now.isBefore(periodStart) || now.isAfter(periodEnd)) {
      return res.status(400).json({
        message: "Current date is not within work period",
        periodStart: user.periodStart,
        periodEnd: user.periodEnd,
      });
    }

    // Find existing work period
    let workPeriod = await prisma.workPeriod.findFirst({
      where: {
        userId: user.id,
        startDate: user.periodStart,
        endDate: user.periodEnd,
      },
      include: {
        UserWorkPeriod: true, // Include UserWorkPeriod relation
      },
    });

    // Create work period if missing
    if (!workPeriod) {
      workPeriod = await prisma.workPeriod.create({
        data: {
          name: `${user.name}'s Work Period`,
          startDate: user.periodStart,
          endDate: user.periodEnd,
          userId: user.id,
          carryOverEnabled: true,
        },
        include: {
          UserWorkPeriod: true, 
        },
      });

      // Create UserWorkPeriod record
      await prisma.userWorkPeriod.create({
        data: {
          userId: user.id,
          workPeriodId: workPeriod.id,
          requiredMinutes: 60 * (periodEnd.diff(periodStart, "day") + 1),
          completedMinutes: 0,
          carryOverMinutes: 0,
        },
      });

      // Refetch workPeriod to ensure userWorkPeriod is included
      workPeriod = await prisma.workPeriod.findUnique({
        where: { id: workPeriod.id },
        include: { UserWorkPeriod: true },
      });
    }

    // Find previous work period to calculate beginningBalance
    const previousWorkPeriod = await prisma.workPeriod.findFirst({
      where: {
        userId: user.id,
        endDate: { lt: user.periodStart }, 
      },
      orderBy: { endDate: "desc" }, 
      include: { UserWorkPeriod: true },
    });

    // Calculate beginningBalance
    let beginningBalance = 0;
    if (previousWorkPeriod?.UserWorkPeriod?.[0]) {
      const { completedMinutes, requiredMinutes } = previousWorkPeriod.UserWorkPeriod[0];
      beginningBalance = completedMinutes - requiredMinutes; 
    }

    const formatHours = (minutes: number) => (minutes / 60).toFixed(1);

    // If beginningBalance is non-zero, return early with a message
    if (beginningBalance !== 0) {
      const response = {
        message: "Cannot track current period hours until previous period balance is cleared",
        beginningBalance: formatHours(beginningBalance),
        periodStart: user.periodStart,
        periodEnd: user.periodEnd,
      };
      console.log(`[getChoreSummary] Summary for user ${userId}:`, response);
      return res.json(response);
    }

    // Proceed with current period tracking if beginningBalance is zero
    const daysPassedInPeriod = Math.min(
      now.diff(periodStart, "day") + 1,
      periodEnd.diff(periodStart, "day") + 1
    );

    const daysRemaining = Math.max(0, periodEnd.diff(now, "day"));

    // Chore aggregation helper
    const aggregateMinutes = async (where: Prisma.ChoreLogWhereInput) => {
      const result = await prisma.choreLog.aggregate({
        where: { userId, ...where },
        _sum: { minutes: true },
      });
      return result._sum.minutes || 0;
    };

    const weekMinutes = await aggregateMinutes({
      date: { gte: now.startOf("week").toDate(), lte: now.endOf("week").toDate() },
    });

    const monthMinutes = await aggregateMinutes({
      date: { gte: now.startOf("month").toDate(), lte: now.endOf("month").toDate() },
    });

    const periodMinutes = await aggregateMinutes({
      date: { gte: user.periodStart, lte: today },
    });

    const expectedMinutes = daysPassedInPeriod * 60;
    const netMinutes = periodMinutes - expectedMinutes;

    const response = {
      weekStatus: `${formatHours(weekMinutes)} / 7`,
      monthStatus: `${formatHours(monthMinutes)} / ${now.daysInMonth()}`,
      periodStatus: `${formatHours(periodMinutes)} / ${daysPassedInPeriod}`,
      currentBalance: formatHours(netMinutes),
      beginningBalance: formatHours(beginningBalance),
      daysRemaining,
      nextDeadline: periodEnd.format("MMMM D, YYYY"),
      periodMinutes,
      expectedMinutes,
    };

    console.log(`[getChoreSummary] Summary for user ${userId}:`, response);

    const isDirectorOrManager = ["DIRECTOR", "MANAGER"].includes(user.role);

    // Low balance alert
    if (!isDirectorOrManager && netMinutes < -420) {
      try {
        const alreadyNotified = await prisma.notificationLog.findFirst({
          where: { userId, type: "balance-alert" },
        });

        if (!alreadyNotified) {
          await notificationService.notifyUserById(userId, {
            title: "Chore Balance Alert",
            body: `Your chore balance is critically low (${formatHours(netMinutes)} hours).`,
            data: { type: "balance-alert" },
          });

          await prisma.notificationLog.create({
            data: { userId, type: "balance-alert", sentAt: new Date() },
          });
        }
      } catch (notificationError) {
        console.error("Notification failed:", notificationError);
      }
    }

    console.log("[getChoreSummary] Successful response");
    res.json(response);
  } catch (error: any) {
    console.error("❌ Error fetching chore summary:", error);
    res.status(500).json({
      message: "Failed to fetch chore summary",
      error: error.message,
    });
  }
}

};

import { Worker } from "bullmq";
import redisClient from "../../config/redis";
import prisma from "../../config/prisma";
import dayjs from "dayjs";

new Worker("notificationQueue", async job => {
  const type = job.name;

  switch (type) {
    case "weeklyReport":
      const users = await prisma.user.findMany({
        where: { role: "RESIDENT" },
        include: {
          ChoreLogs: {
            where: {
              date: {
                gte: dayjs().subtract(7, "day").startOf("day").toDate(),
              },
            },
          },
        },
      });

      for (const user of users) {
        const minutes = user.ChoreLogs.reduce((sum, log) => sum + log.minutes, 0);
        const hours = (minutes / 60).toFixed(1);

        console.log(`[Notification] ${user.name} completed ${hours} hours this week`);
        // TODO: Send email or push notification here
      }

      break;

    case "carryOverPeriod":
      const periodId = job.data.periodId;

      const logs = await prisma.choreLog.findMany({
        where: {
          workPeriodId: periodId,
        },
      });

      const grouped = logs.reduce((acc, log) => {
        acc[log.userId] = (acc[log.userId] || 0) + log.minutes;
        return acc;
      }, {} as Record<number, number>);

      for (const [userId, totalMinutes] of Object.entries(grouped)) {
        const parsed = parseInt(userId);
        const period = await prisma.userWorkPeriod.findFirst({
          where: { userId: parsed, workPeriodId: periodId },
        });

        const extra = totalMinutes - (period?.requiredMinutes ?? 0);
        if (extra > 0) {
          // Apply carry over
          await prisma.userWorkPeriod.update({
            where: { id: period!.id },
            data: { carryOverMinutes: extra },
          });
        }
      }

      break;

    case "rotateManager":
      // Assign new manager logic (manual or round-robin)
      console.log("Rotating resident managers...");
      // Implement your logic here
      break;
  }
}, { connection: redisClient, });

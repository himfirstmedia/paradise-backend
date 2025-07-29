import { notificationQueue } from "../queues/notificationQueue";
import prisma from "../../config/prisma";

export async function scheduleCarryOverJobs() {
  const periods = await prisma.workPeriod.findMany({
    where: {
      endDate: {
        gte: new Date(),
      },
    },
  });

  for (const period of periods) {
    const delay = new Date(period.endDate).getTime() - Date.now();

    await notificationQueue.add(
      "carryOverPeriod",
      { periodId: period.id },
      {
        delay,
        jobId: `carryOver-${period.id}`,
      }
    );
  }
}

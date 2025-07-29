import prisma from "config/prisma";

export const ensureUserWorkPeriodsForHouse = async (houseId: number, workPeriodId: number) => {
  const users = await prisma.user.findMany({
    where: { houseId },
  });

  for (const user of users) {
    const existing = await prisma.userWorkPeriod.findUnique({
      where: {
        userId_workPeriodId: {
          userId: user.id,
          workPeriodId,
        },
      },
    });

    if (!existing) {
      await prisma.userWorkPeriod.create({
        data: {
          userId: user.id,
          workPeriodId,
          carryOverMinutes: 0,
          requiredMinutes: 0,
          completedMinutes: 0,
        },
      });
    }
  }
};

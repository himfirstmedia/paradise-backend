// workPeriodService.ts
import prisma from "../config/prisma";
import dayjs from "dayjs";

export const workPeriodService = {
  configureForUser: async (userId: number) => {
    const start = dayjs().startOf("month").toDate();
    const end = dayjs().endOf("month").toDate();

    return prisma.workPeriod.create({
      data: {
        user: { connect: { id: userId } },
        name: `Work Period ${dayjs().format("MMMM YYYY")}`,
        startDate: start,
        endDate: end,
      },
    });
  },
};

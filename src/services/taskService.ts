import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

export const taskService = {
  create: (data: Prisma.taskCreateInput) => {
    return prisma.task.create({ data });
  },

  findAll: () => {
    return prisma.task.findMany({
      where: {
        OR: [
          // Include tasks without any chore association
          { choreId: null },
          // Include tasks where the chore isn't assigned to any user
          {
            chore: {
              currentUser: null,
            },
          },
        ],
      },
      include: {
        user: true,
        chore: true,
      },
    });
  },

  findById: (id: number) => {
    console.log("🔍 [taskService] findById called with id: ", id);
    return prisma.task.findUnique({ where: { id } });
  },

  update: (id: number, data: Partial<Prisma.taskUpdateInput> & { userId?: number | null }) => {
    const { userId, ...rest } = data;
    const updateData: Prisma.taskUpdateInput = { ...rest };

    if (userId !== undefined) {
      updateData.user = userId === null
        ? { disconnect: true }
        : { connect: { id: userId } };
    }

    return prisma.task.update({
      where: { id },
      data: updateData,
    });
  },

  delete: (id: number) => {
    return prisma.task.delete({ where: { id } });
  },

//   findTasksByUserAndDateRange: (userId: number, startDate: Date, endDate: Date) => {
//   console.log("🔍 [taskService] Finding tasks for user:", userId, "from:", startDate, "to:", endDate);

//   return prisma.task.findMany({
//     where: {
//       userId,
//       startDate: {
//         gte: startDate,
//         lte: endDate,
//       },
//     },
//   });
// },

};

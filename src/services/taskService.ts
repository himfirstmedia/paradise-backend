import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

export const taskService = {
  create: (data: Prisma.taskCreateInput) => {
    return prisma.task.create({ data });
  },

  findAll: () => prisma.task.findMany(),

  findById: (id: number) => {
    return prisma.task.findUnique({ where: { id } });
  },

  update: async (id: number, data: Partial<Prisma.taskUpdateInput> & { userId?: number | null }) => {
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
};

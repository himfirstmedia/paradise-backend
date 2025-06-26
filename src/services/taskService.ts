import prisma from '../config/prisma';
import { Prisma, task } from '@prisma/client';

export const taskService = {
  create: (data: Prisma.taskCreateInput) => prisma.task.create({ data }),
  findAll: () => prisma.task.findMany(),
  findById: (id: number) => prisma.task.findUnique({ where: { id } }),
  update: async (id: number, data: any) => {
    const { userId, ...rest } = data;
    let updateData: any = { ...rest };
    if (userId !== undefined) {
      updateData.user = userId === null
        ? { disconnect: true }
        : { connect: { id: userId } };
    }
    return prisma.task.update({ where: { id }, data: updateData });
  },
  delete: (id: number) => prisma.task.delete({ where: { id } }),
};
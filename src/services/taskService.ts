import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

export const taskService = {
  create: (data: Prisma.ChoreCreateInput) => {
    return prisma.chore.create({ data });
  },

  findAll: () => {
    return prisma.chore.findMany({
      where: {
        OR: [
          { 
            userId: null, 
            currentUsers: null 
          },
        ],
      },
      include: {
        user: true,
        currentUsers: true,
      },
    });
  },

  findById: (id: number) => {
    console.log("🔍 [taskService] findById called with id: ", id);
    return prisma.chore.findUnique({ where: { id } });
  },

  update: (id: number, data: Partial<Prisma.ChoreUpdateInput> & { userId?: number | null }) => {
    const { userId, ...rest } = data;
    const updateData: Prisma.ChoreUpdateInput = { ...rest };

    if (userId !== undefined) {
      updateData.user = userId === null
        ? { disconnect: true }
        : { connect: { id: userId } };
    }

    return prisma.chore.update({
      where: { id },
      data: updateData,
    });
  },

  delete: (id: number) => {
    return prisma.chore.delete({ where: { id } });
  },


};

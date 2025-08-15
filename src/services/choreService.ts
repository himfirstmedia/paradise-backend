import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

export const choreService = {
  
  create: (data: Prisma.ChoreCreateInput) => {
    return prisma.chore.create({ data });
  },

  findAll: () => {
  return prisma.chore.findMany({
    include: {
      house: true,
      currentUsers: true,
    },
  });
},
  
  findById: (id: number) => {
    return prisma.chore.findUnique({
      where: { id },
      include: {
        house: true,
        currentUsers: true,
      },
    });
  },

  update: (id: number, data: Partial<Prisma.ChoreUpdateInput> & { houseId?: number, isPrimary?: boolean }) => {
    const { houseId, ...rest } = data;
    const updateData: Prisma.ChoreUpdateInput = { ...rest };

    if (houseId !== undefined) {
      updateData.house = { connect: { id: houseId } };
    }

    return prisma.chore.update({
      where: { id },
      data: updateData,
    });
  },

  delete: (id: number) => {
    return prisma.chore.delete({
      where: { id },
    });
  },

  findByHouse: (houseId: number) => {
    return prisma.chore.findMany({
      where: { houseId },
      include: {
        house: true,
        currentUsers: true,
      },
    });
  },

  
  findDetailedById: (id: number) => {
  return prisma.chore.findUnique({
    where: { id },
    include: {
      ChoreLogs: { 
        include: {
          user: true,
        },
      },
      house: true,
      currentUsers: true,
    },
  });
},
};

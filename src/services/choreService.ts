import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

export const choreService = {
  
  create: (data: Prisma.choreCreateInput) => {
    return prisma.chore.create({ data });
  },

  
  findAll: () => {
    return prisma.chore.findMany({
      include: {
        house: true,
        tasks: true,
        currentUser: true, 
      },
    });
  },

  
  findById: (id: number) => {
    console.log("🔍 [choreService] findById called with id:", id);
    return prisma.chore.findUnique({
      where: { id },
      include: {
        house: true,
        tasks: true,
        currentUser: true,
      },
    });
  },

  
  update: (id: number, data: Partial<Prisma.choreUpdateInput> & { houseId?: number }) => {
    const { houseId, ...rest } = data;
    const updateData: Prisma.choreUpdateInput = { ...rest };

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
      include: { tasks: true },
    });
  },

  
  findDetailedById: (id: number) => {
    return prisma.chore.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            user: true,
          },
        },
        house: true,
        currentUser: true,
      },
    });
  },
};

import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";

export const userService = {
  create: (data: Prisma.userCreateInput) => prisma.user.create({ data }),
  findAll: () =>
    prisma.user.findMany({
      include: {
        task: true,
        house: true,
      },
    }),
  findById: (id: number) =>
    prisma.user.findUnique({
      where: { id },
      include: { task: true, house: true },
    }),
  update: (id: number, data: any) =>
    prisma.user.update({ where: { id }, data }),
  delete: (id: number) => prisma.user.delete({ where: { id } }),
  login: async (email: string, password: string) => {
    return prisma.user.findUnique({
      where: { email, password },
      include: { task: true, house: true },
    });
  },
};

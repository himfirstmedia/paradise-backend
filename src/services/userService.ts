import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import sendExpoNotification from "./notification";
const SALT_ROUNDS = 10;

export const userService = {
  create: async (data: any) => {
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      ...data,
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      password: hashedPassword,
    },
  });
},

  findAll: () =>
    prisma.user.findMany({
      include: {
        chores: true,
        house: true,
      },
    }),
  findById: (id: number) =>
    prisma.user.findUnique({
      where: { id },
      include: { chores: true, house: true },
    }),
  update: async (id: number, data: any) => {
    return prisma.user.update({
      where: { id },
      data: {
      ...data,
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
    },
    });
  },

  delete: (id: number) => prisma.user.delete({ where: { id } }),
  login: async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { chores: true, house: true },
    });

    if (!user) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) return null;

    return user;
  },
};

import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import bcrypt from "bcrypt";
import { sendExpoNotification } from "./notification";
const SALT_ROUNDS = 10;

export const userService = {
  create: async (data: any) => {
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  },
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
  update: async (id: number, data: any) => {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  delete: (id: number) => prisma.user.delete({ where: { id } }),
  login: async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { task: true, house: true },
    });

    if (!user) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) return null;

    return user;
  },
};
// Example usage:
// sendExpoNotification(
//   "ExponentPushToken[gOWXGSIZ0n-NcexQgBXrAv]",
//   "Hello!",
//   "This is a test notification.",
//   { someData: "value" }
// );

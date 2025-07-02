import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import bcrypt from "bcrypt";
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
  const { password, oldPassword, ...otherUpdates } = data;


  if (password && oldPassword) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new Error("Current password is incorrect");

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    otherUpdates.password = hashedPassword;
  } else if (password || oldPassword) {
    throw new Error("Both old and new passwords are required to update password.");
  }

  return prisma.user.update({
    where: { id },
    data: otherUpdates,
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

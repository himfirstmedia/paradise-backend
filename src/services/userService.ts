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
    if (data.password && data.oldPassword) {
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        throw new Error("User not found");
      }

      // console.log("Comparing:", data.oldPassword, "to", user.password);
      // const testMatch = await bcrypt.compare(data.oldPassword, user.password);
      // console.log("Manual comparison result:", testMatch);

      const isValid = await bcrypt.compare(data.oldPassword, user.password);
      if (!isValid) {
        throw new Error("Current password is incorrect");
      }

      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
      return prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });
    }

    const { id: _id, oldPassword, ...updateData } = data;

    return prisma.user.update({
      where: { id },
      data: updateData,
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

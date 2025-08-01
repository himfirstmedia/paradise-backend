import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export const houseService = {
  create: (data: Prisma.houseCreateInput) => prisma.house.create({ data }),
  findAll: () => prisma.house.findMany({
  include: {
    users: true,
    workPeriod: true,
  },
}),
findById: (id: number) => prisma.house.findUnique({
  where: { id },
  include: { users: true, workPeriod: true },
}),
  update: (id: number, data: any) => prisma.house.update({ where: { id }, data }),
  delete: (id: number) => prisma.house.delete({ where: { id } }),
  
};
import { Prisma } from '@prisma/client';
import  prisma  from '../config/prisma';

export const scriptureService = {
  create: (data: Prisma.scriptureCreateInput) => prisma.scripture.create({ data }),
  findAll: () => prisma.scripture.findMany(),
  findById: (id: number) => prisma.scripture.findUnique({ where: { id } }),
  update: (id: number, data: any) => prisma.scripture.update({ where: { id }, data }),
  delete: (id: number) => prisma.scripture.delete({ where: { id } })
};

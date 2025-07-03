import prisma from '../config/prisma';

export const feedbackService = {
  ccreate: async (data: any) => {
  const { userId, taskId, ...rest } = data;
  let createData: any = { ...rest };

  if (userId !== undefined) {
    createData.user = { connect: { id: userId } };
  }
  if (taskId !== undefined) {
    createData.task = { connect: { id: taskId } };
  } else {
    createData.type = 'Suggestion';
  }
  return prisma.feedback.create({ data: createData });
},

  findAll: () => prisma.feedback.findMany(),
  findById: (id: number) => prisma.feedback.findUnique({ where: { id } }),
  update: async (id: number, data: any) => {
    const { userId, taskId, ...rest } = data;
    let updateData: any = { ...rest };
    if (userId !== undefined) {
      updateData.user = userId === null
        ? { disconnect: true }
        : { connect: { id: userId } };
    }
    if (taskId !== undefined) {
      updateData.task = taskId === null
        ? { disconnect: true }
        : { connect: { id: taskId } };
    }
    return prisma.feedback.update({ where: { id }, data: updateData });
  },
  delete: (id: number) => prisma.feedback.delete({ where: { id } })
};
import prisma from '../config/prisma';

export const feedbackService = {
  create: async (data: any) => {
    const { userId, taskId, type, ...rest } = data;
    let createData: any = { ...rest, type };

    if (type === 'Comment' && !taskId) {
      throw new Error('Selecting a task is required for comments');
    }
    if (type === 'Suggestion' && taskId) {
      throw new Error('Suggestions cannot have a task association');
    }

    if (userId) {
      createData.user = { connect: { id: userId } };
    }
    if (taskId && type === 'Comment') {
      createData.task = { connect: { id: taskId } };
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
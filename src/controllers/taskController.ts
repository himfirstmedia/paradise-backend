import { Request, Response } from 'express';
import { taskService } from '../services/taskService';
import { task_category, task_status } from "@prisma/client";

export const taskController = {
  create: async (req: Request, res: Response) => {
    try {
      const {
        name,
        startDate,
        endDate,
        description,
        progress,
        status,
        category,
        instruction,
        userId,
      } = req.body;


      const validCategory = Object.values(task_category).includes(category)
        ? (category as task_category)
        : undefined;

      const validStatus = Object.values(task_status).includes(status)
        ? (status as task_status)
        : undefined;

      const task = await taskService.create({
        name,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        description,
        instruction,
        progress,
        category: validCategory,
        status: validStatus,
        user: userId
          ? {
              connect: {
                id: Number(userId),
              },
            }
          : undefined,
      });

      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({
        message:
          error?.message || "An error occurred while creating the task.",
      });
    }
  },
  findAll: async (_: Request, res: Response) => {
    const users = await taskService.findAll();
    res.json(users);
  },
  findById: async (req: Request, res: Response) => {
    const user = await taskService.findById(Number(req.params.id));
    res.json(user);
  },
  update: async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    const updated = await taskService.update(Number(req.params.id), req.body);
    res.json(updated);
  },
  delete: async (req: Request, res: Response) => {
    await taskService.delete(Number(req.params.id));
    res.status(204).send();
  }
};

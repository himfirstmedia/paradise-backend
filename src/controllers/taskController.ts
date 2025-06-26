import { Request, Response } from 'express';
import { taskService } from '../services/taskService';

export const taskController = {
  create: async (req: Request, res: Response) => {
    const user = await taskService.create(req.body);
    res.status(201).json(user);
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

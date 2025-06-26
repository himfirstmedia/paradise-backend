import { Request, Response } from 'express';
import { feedbackService } from '../services/feedbackService';

export const feedbackController = {
  create: async (req: Request, res: Response) => {
    const user = await feedbackService.create(req.body);
    res.status(201).json(user);
  },
  findAll: async (_: Request, res: Response) => {
    const users = await feedbackService.findAll();
    res.json(users);
  },
  findById: async (req: Request, res: Response) => {
    const user = await feedbackService.findById(Number(req.params.id));
    res.json(user);
  },
  update: async (req: Request, res: Response) => {
    const updated = await feedbackService.update(Number(req.params.id), req.body);
    res.json(updated);
  },
  delete: async (req: Request, res: Response) => {
    await feedbackService.delete(Number(req.params.id));
    res.status(204).send();
  }
};

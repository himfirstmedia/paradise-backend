import { Request, Response } from 'express';
import { scriptureService } from '../services/scriptureService';

export const scriptureController = {
  create: async (req: Request, res: Response) => {
    const user = await scriptureService.create(req.body);
    res.status(201).json(user);
  },
  findAll: async (_: Request, res: Response) => {
    const users = await scriptureService.findAll();
    res.json(users);
  },
  findById: async (req: Request, res: Response) => {
    const user = await scriptureService.findById(Number(req.params.id));
    res.json(user);
  },
  update: async (req: Request, res: Response) => {
    const updated = await scriptureService.update(Number(req.params.id), req.body);
    res.json(updated);
  },
  delete: async (req: Request, res: Response) => {
    await scriptureService.delete(Number(req.params.id));
    res.status(204).send();
  }
};

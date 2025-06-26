import { Request, Response } from "express";
import { houseService } from "../services/houseService";

export const houseController = {
  create: async (req: Request, res: Response) => {
    const house = await houseService.create(req.body);
    res.status(201).json(house);
  },
  findAll: async (_: Request, res: Response) => {
    const houses = await houseService.findAll();
    res.json(houses);
  },
  findById: async (req: Request, res: Response) => {
    const house = await houseService.findById(Number(req.params.id));
    res.json(house);
  },
  update: async (req: Request, res: Response) => {
    const houseId = Number(req.params.id);
    const updated = await houseService.update(houseId, req.body);
    res.json(updated);
  },
  delete: async (req: Request, res: Response) => {
    await houseService.delete(Number(req.params.id));
    res.status(204).send();
  },
};

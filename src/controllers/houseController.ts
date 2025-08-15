import { Request, Response } from "express";
import { houseService } from "../services/houseService";
import prisma from "config/prisma";
// import { ensureUserWorkPeriodsForHouse } from "../services/workPeriodService";

export const houseController = {
create: async (req: Request, res: Response) => {
  try {
    const { name, abbreviation, capacity } = req.body;

    if (!name || !abbreviation) {
      return res.status(400).json({ error: "Name and abbreviation are required" });
    }

    const newHouse = await prisma.house.create({
      data: {
        name,
        abbreviation,
        capacity,
      },
    });

    res.status(201).json(newHouse);
  } catch (error) {
    console.log("House Creation Error: ", error);
    res.status(500).json({ error: "Failed to create house" });
  }
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
  try {
    const houseId = Number(req.params.id);
    const { name, abbreviation, capacity } = req.body;

    if (!name || !abbreviation) {
      return res.status(400).json({ error: "Name and abbreviation are required" });
    }

    const existingHouse = await prisma.house.findUnique({
      where: { id: houseId },
    });

    if (!existingHouse) {
      return res.status(404).json({ error: "House not found" });
    }

    const updatedHouse = await prisma.house.update({
      where: { id: houseId },
      data: {
        name,
        abbreviation,
        capacity,
      },
    });

    res.json(updatedHouse);
  } catch (error) {
    console.log("House Update Error:", error);
    res.status(500).json({ error: "Failed to update house" });
  }
},

  delete: async (req: Request, res: Response) => {
    await houseService.delete(Number(req.params.id));
    res.status(204).send();
  },
};

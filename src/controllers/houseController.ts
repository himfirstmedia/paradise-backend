import { Request, Response } from "express";
import { houseService } from "../services/houseService";
import prisma from "config/prisma";
import { ensureUserWorkPeriodsForHouse } from "../services/workPeriodService";

export const houseController = {
  create: async (req: Request, res: Response) => {
    try {
      const { name, abbreviation, capacity, workPeriodStart, workPeriodEnd } = req.body;

      const house = await prisma.$transaction(async (tx) => {
        let workPeriodId: number | null = null;

        if (workPeriodStart && workPeriodEnd) {
          const workPeriod = await tx.workPeriod.create({
            data: {
              name: `Work Period for ${name}`,
              startDate: new Date(workPeriodStart),
              endDate: new Date(workPeriodEnd),
              carryOverEnabled: false,
            },
          });
          workPeriodId = workPeriod.id;
        }

        return tx.house.create({
          data: {
            name,
            abbreviation,
            capacity,
            workPeriodId,
          },
        });
      });

      // After creating house, sync userWorkPeriods
      if (house.workPeriodId) {
        await ensureUserWorkPeriodsForHouse(house.id, house.workPeriodId);
      }

      res.status(201).json(house);
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
      const { houseName, abbreviation, capacity, workPeriodStart, workPeriodEnd } = req.body;

      console.log("House Update: ", req.body);

      const updatedHouse = await prisma.$transaction(async (tx) => {
        const existingHouse = await tx.house.findUnique({
          where: { id: houseId },
          include: { workPeriod: true },
        });

        if (!existingHouse) throw new Error("House not found");

        let workPeriodId: number | null = existingHouse.workPeriodId;

        if (workPeriodStart !== undefined && workPeriodEnd !== undefined) {
          if (workPeriodStart === null && workPeriodEnd === null) {
            if (existingHouse.workPeriodId) {
              await tx.workPeriod.delete({
                where: { id: existingHouse.workPeriodId },
              });
            }
            workPeriodId = null;
          } else if (workPeriodStart && workPeriodEnd) {
            if (existingHouse.workPeriodId) {
              await tx.workPeriod.update({
                where: { id: existingHouse.workPeriodId },
                data: {
                  startDate: new Date(workPeriodStart),
                  endDate: new Date(workPeriodEnd),
                },
              });
            } else {
              const newWorkPeriod = await tx.workPeriod.create({
                data: {
                  name: `Work Period for ${houseName}`,
                  startDate: new Date(workPeriodStart),
                  endDate: new Date(workPeriodEnd),
                  carryOverEnabled: false,
                },
              });
              workPeriodId = newWorkPeriod.id;
            }
          }
        }

        return tx.house.update({
          where: { id: houseId },
          data: {
            name: houseName,
            abbreviation,
            capacity,
            workPeriodId,
          },
        });
      });

      // After updating house, sync userWorkPeriods
      if (updatedHouse.workPeriodId) {
        await ensureUserWorkPeriodsForHouse(updatedHouse.id, updatedHouse.workPeriodId);
      }

      res.json(updatedHouse);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
  delete: async (req: Request, res: Response) => {
    await houseService.delete(Number(req.params.id));
    res.status(204).send();
  },
};

import { Request, Response } from "express";
import { choreService } from "../services/choreService";
import prisma from "config/prisma";

export const choreController = {
  create: async (req: Request, res: Response) => {
  try {
    const { name, description, house: houseId } = req.body;

    if (!name || !houseId) {
      return res.status(400).json({ message: "Name and houseId are required." });
    }

    const chore = await choreService.create({
      name,
      description,
      house: {
        connect: { id: Number(houseId) },
      },
    });

    res.status(201).json(chore);
  } catch (error: any) {
    console.error("❌ Error creating chore:", error);
    res.status(500).json({
      message: error?.message || "An error occurred while creating the chore.",
    });
  }
},


  findAll: async (_: Request, res: Response) => {
    try {
      const chores = await choreService.findAll();
      res.json(chores);
    } catch (error: any) {
      console.error("Error fetching chores:", error);
      res.status(500).json({ message: error.message });
    }
  },

  findById: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid chore ID" });

      const chore = await choreService.findById(id);
      if (!chore) return res.status(404).json({ error: "Chore not found" });

      res.json(chore);
    } catch (error: any) {
      console.error("Error fetching chore by ID:", error);
      res.status(500).json({ message: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid chore ID" });

      const { name, description, houseId } = req.body;

      const updateData: any = {
        name,
        description,
      };

      if (houseId) {
        updateData.house = { connect: { id: Number(houseId) } };
      }

      const updatedChore = await choreService.update(id, updateData);
      res.json(updatedChore);
    } catch (error: any) {
      console.error("Error updating chore:", error);
      res.status(500).json({
        message: error?.message || "Failed to update chore.",
      });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid chore ID" });

      await choreService.delete(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting chore:", error);
      res.status(500).json({ message: error.message });
    }
  },

  findByHouse: async (req: Request, res: Response) => {
    try {
      const houseId = Number(req.params.houseId);
      if (isNaN(houseId)) return res.status(400).json({ error: "Invalid house ID" });

      const chores = await choreService.findByHouse(houseId);
      res.json(chores);
    } catch (error: any) {
      console.error("Error fetching chores by house:", error);
      res.status(500).json({ message: error.message });
    }
  },

  findDetailedById: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid chore ID" });

      const chore = await choreService.findDetailedById(id);
      if (!chore) return res.status(404).json({ error: "Chore not found" });

      res.json(chore);
    } catch (error: any) {
      console.error("Error fetching detailed chore:", error);
      res.status(500).json({ message: error.message });
    }
  },
};

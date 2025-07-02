import { Request, Response } from "express";
import { userService } from "../services/userService";

export const userController = {
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    console.log("Login attempt:", { email, password });

    const user = await userService.login(email, password);

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  },

  create: async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  },
  findAll: async (_: Request, res: Response) => {
    const users = await userService.findAll();
    res.json(users);
  },
  findById: async (req: Request, res: Response) => {
    const user = await userService.findById(Number(req.params.id));
    res.json(user);
  },
  update: async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    const { password, oldPassword } = req.body;
    if (password && oldPassword) {
      // Fetch user
      const user = await userService.findById(userId);
      if (!user || user.password !== oldPassword) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect." });
      }
      // Update password
      const updated = await userService.update(userId, { password });
      return res.json(updated);
    }
    // ...handle other updates...
    const updated = await userService.update(userId, req.body);
    res.json(updated);
  },
  delete: async (req: Request, res: Response) => {
    await userService.delete(Number(req.params.id));
    res.status(204).send();
  },
};

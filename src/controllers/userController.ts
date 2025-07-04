import { Request, Response } from "express";
import { userService } from "../services/userService";
import prisma from "config/prisma";
import bcrypt from "bcrypt"

const SALT_ROUNDS = 10;

export const userController = {
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await userService.login(email, password);

    if (user) {
      res.json(user);
    } else {
       res.status(404).json({ message: "Invalid email or password" });
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
    try {
      const userId = Number(req.params.id);
      const { password, oldPassword, ...otherData } = req.body;

      // 🔐 If attempting to change password
      if (password || oldPassword) {
        if (!password || !oldPassword) {
          return res.status(400).json({ message: "Both old and new passwords are required to update password." });
        }

        const user = await userService.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found." });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Current password is incorrect." });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Final update with hashed password
        const updatedUser = await userService.update(userId, {
          ...otherData,
          password: hashedPassword,
        });

        return res.json(updatedUser);
      }

      // 🔧 No password change, just update other fields
      const updatedUser = await userService.update(userId, otherData);
      return res.json(updatedUser);

    } catch (error) {
      console.error("🔴 Update error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  delete: async (req: Request, res: Response) => {
    await userService.delete(Number(req.params.id));
    res.status(204).send();
  },
  verifyPassword: async (req: Request, res: Response) => {
  const { id } = req.params;
  const password = req.query.password as string;

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const storedHash = user.password;
  const input = password;
  const match = await bcrypt.compare(input, storedHash);

  // 🚧 Re-hash the input for comparison (will not match storedHash!)
  const rehashedInput = await bcrypt.hash(input, 10);

  // ✅ Logs
  console.log("🔐 Password Verification Debug Info:");
  console.log("Input Password:", input);
  console.log("Stored Hash (from DB):", storedHash);
  console.log("Rehashed Input Password:", rehashedInput);
  console.log("Match Result:", match);

  return res.json({
    match,
    inputPassword: input,
    rehashedInput,
    storedHash,
  });
}
}

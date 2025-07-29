import { Router } from "express";
import { chatController } from "../../../controllers/chatController";

const router = Router();

function asyncHandler(fn: any) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Chat management
router.post("/", asyncHandler(chatController.createChat));
router.get("/:id", asyncHandler(chatController.getChat));
router.get("/user/:userId", asyncHandler(chatController.getUserChats));

// Message handling
router.post("/message", asyncHandler(chatController.sendMessage));
router.get("/:chatId/messages", asyncHandler(chatController.getMessages));
router.post("/mark-read", asyncHandler(chatController.markAsRead));

// Group management
router.post("/add-to-group", asyncHandler(chatController.addToGroup));

export default router;
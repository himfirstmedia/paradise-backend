import { Router } from "express";
import { chatController } from "../../../controllers/chatController";
import { upload } from "middlewares/upload";
import { catchAsync } from "utils/catch_error";


const router = Router();

// Chat management
router.post("/", catchAsync(chatController.createChat));
router.get("/:id", catchAsync(chatController.getChat));
router.get("/user/:userId", catchAsync(chatController.getUserChats));

// Message handling
router.post("/message", catchAsync(chatController.sendMessage));
router.get("/:chatId/messages", catchAsync(chatController.getMessages));
router.post("/mark-read", catchAsync(chatController.markAsRead));

// Group management
router.post("/add-to-group", catchAsync(chatController.addToGroup));

// Image upload route
router.post("/upload", upload("chats").single("image"), catchAsync(chatController.uploadImage));

export default router;
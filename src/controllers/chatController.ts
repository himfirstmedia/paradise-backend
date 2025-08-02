import { Request, Response } from 'express';
import { chatService } from '../services/chatService';
import { Prisma } from "@prisma/client";
import prisma from 'config/prisma';
import { notificationService } from '../services/notificationService';
import cloudinary from 'config/cloudinary';

// Define a custom Request type for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}


function extractCloudinaryPublicId(imageUrl: string): string | null {
  try {
    const urlParts = imageUrl.split("/");
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.split(".").slice(0, -1).join(".");
    const folder = urlParts.slice(-2, -1)[0]; 
    return `${folder}/${publicId}`;
  } catch {
    return null;
  }
}



export const chatController = {
  createChat: async (req: Request, res: Response) => {
    try {
      const { participantIds, houseIds, isGroup, name } = req.body;
      console.log('--- CREATE CHAT REQUEST ---', { participantIds, houseIds, isGroup, name });

      // Validate payload
      if (!participantIds || !Array.isArray(participantIds)) {
        console.error('Invalid participantIds:', participantIds);
        return res.status(400).json({ error: 'participantIds is required and must be an array' });
      }

      if (isGroup && participantIds.length < 1) {
        console.error('Group chat requires at least 1 participant');
        return res.status(400).json({ error: 'Group chat must have at least 1 participant' });
      }

      if (!isGroup && participantIds.length !== 2) {
        console.error('Individual chat requires exactly 2 participants');
        return res.status(400).json({ error: 'Individual chat must have exactly 2 participants' });
      }

      // Check for existing individual chat
      if (!isGroup) {
        const existingChat = await prisma.chat.findFirst({
          where: {
            isGroup: false,
            users: {
              every: {
                userId: { in: participantIds }
              }
            }
          },
          include: { users: true, house: true }
        });

        if (existingChat) {
          console.log('Returning existing individual chat:', existingChat.id);
          return res.status(200).json(existingChat);
        }
      }

      // Check for existing group chat with matching houseIds and participantIds
      if (isGroup && houseIds && houseIds.length > 0) {
        const existingGroupChats = await prisma.chat.findMany({
          where: {
            isGroup: true,
            houseId: { in: houseIds }
          },
          include: {
            users: true,
            house: true
          }
        });

        const matchingChat = existingGroupChats.find(chat => {
          const chatHouseIds = chat.house ? [chat.house.id] : [];
          const chatUserIds = chat.users.map(u => u.userId).sort();
          const requestHouseIds = [...houseIds].sort();
          const requestUserIds = [...participantIds].sort();
          return (
            JSON.stringify(chatHouseIds) === JSON.stringify(requestHouseIds) &&
            JSON.stringify(chatUserIds) === JSON.stringify(requestUserIds)
          );
        });

        if (matchingChat) {
          console.log('Returning existing group chat:', matchingChat.id);
          return res.status(200).json(matchingChat);
        }
      }

      // Generate chat name if not provided
      let chatName = name;
      if (!chatName && isGroup && houseIds?.length) {
        const houses = await prisma.house.findMany({
          where: { id: { in: houseIds } },
          select: { abbreviation: true }
        });

        chatName = houses.map(h => h.abbreviation).join(' & ');
        console.log('Generated chat name from houses:', chatName);
      }

      // Create new chat
      const chatData: Prisma.chatCreateInput = {
        name: chatName ?? "Group Chat",
        isGroup,
        users: {
          create: participantIds.map((userId: number) => ({ userId }))
        },
        house: houseIds && houseIds.length > 0 ? { connect: { id: houseIds[0] } } : undefined
      };

      const chat = await chatService.createChat(chatData);
      console.log('Chat created:', chat.id);

      // Notify all participants
      for (const userId of participantIds) {
        console.log(`Notifying user ${userId} about being added to chat ${chat.id}`);
        await notificationService.notifyAddedToChat(Number(userId), chat.id);
      }

      res.status(201).json(chat);
    } catch (error: any) {
      console.error("Error creating chat:", error);
      res.status(500).json({
        error: 'Failed to create chat',
        details: error.message || 'An unexpected error occurred'
      });
    }
  },

  getChat: async (req: Request, res: Response) => {
    try {
      const chatId = Number(req.params.id);
      console.log('--- GET CHAT REQUEST ---', { chatId });
      
      const chat = await chatService.findChatById(chatId);
      
      if (!chat) {
        console.error('Chat not found for ID:', chatId);
        return res.status(404).json({ error: 'Chat not found' });
      }
      
      console.log('Chat found:', chat);
      res.json(chat);
    } catch (error: any) {
      console.error("Error getting chat:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while fetching the chat.",
      });
    }
  },

  getUserChats: async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);
      console.log('--- GET USER CHATS REQUEST ---', { userId });
      
      if (isNaN(userId)) {
        console.error('Invalid user ID:', req.params.userId);
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const chats = await chatService.findUserChats(userId);
      console.log(`Found ${chats.length} chats for user ${userId}`);
      
      res.json(chats);
    } catch (error: any) {
      console.error("Error getting user chats:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while fetching user chats.",
      });
    }
  },

  sendMessage: async (req: Request, res: Response) => {
    try {
      console.log('--- SEND MESSAGE REQUEST ---', { body: req.body });
      
      const { chatId, senderId, content, image } = req.body;
      const message = await chatService.createMessage({
        chat: { connect: { id: chatId } },
        sender: { connect: { id: senderId } },
        content,
        image: image || null,
        readBy: [senderId], 
      });
      
      console.log('Message sent successfully:', message.id);
      
      // Notify chat participants about the new message
      await notificationService.notifyNewMessage(Number(chatId), message.id, Number(senderId));

      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while sending the message.",
      });
    }
  },

  deleteMessage: async (req: Request, res: Response) => {
  const chatId = Number(req.params.id);
  if (isNaN(chatId)) {
    return res.status(400).json({ error: "Invalid chat ID" });
  }

  try {
    console.log('--- DELETE CHAT REQUEST ---', { chatId });

    // Check if the chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: true, 
      },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Delete associated Cloudinary images from messages
    for (const message of chat.messages) {
      if (message.image) {
        const publicId = extractCloudinaryPublicId(message.image);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted Cloudinary image: ${publicId}`);
          } catch (err: any) {
            console.warn(`Failed to delete Cloudinary image: ${publicId}`, err.message);
          }
        }
      }
    }

    // Delete messages, chat users, then the chat
    await prisma.message.deleteMany({ where: { chatId } });
    await prisma.chatUser.deleteMany({ where: { chatId } });
    await prisma.chat.delete({ where: { id: chatId } });

    console.log(`Chat ${chatId} and all related data deleted`);
    res.status(200).json({ success: true, message: "Chat deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting chat:", error);
    res.status(500).json({
      error: "An error occurred while deleting the chat",
      details: error?.message,
    });
  }
},

  addToGroup: async (req: Request, res: Response) => {
    try {
      const { chatId, userId } = req.body;
      console.log('--- ADD TO GROUP REQUEST ---', { chatId, userId });
      
      const chat = await chatService.findChatById(chatId);
      
      if (!chat) {
        console.error('Chat not found for ID:', chatId);
        return res.status(404).json({ error: 'Chat not found' });
      }
      
      if (!chat.isGroup) {
        console.error('Cannot add to individual chat:', chatId);
        return res.status(400).json({ error: 'Cannot add to individual chat' });
      }
      
      const result = await chatService.addUserToChat(chatId, userId);
      console.log(`User ${userId} added to chat ${chatId}`);
      
      // Notify the user about being added to the chat
      await notificationService.notifyAddedToChat(Number(userId), chatId);

      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error adding user to group:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while adding user to group.",
      });
    }
  },

  markAsRead: async (req: Request, res: Response) => {
    try {
      const { chatId, userId } = req.body;
      console.log('--- MARK AS READ REQUEST ---', { chatId, userId });
      
      await chatService.markMessagesAsRead(chatId, userId);
      console.log(`Messages marked as read for user ${userId} in chat ${chatId}`);
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while marking messages as read.",
      });
    }
  },

  getMessages: async (req: Request, res: Response) => {
    try {
      const chatId = Number(req.params.chatId);
      console.log('--- GET MESSAGES REQUEST ---', { chatId });
      
      if (isNaN(chatId)) {
        console.error('Invalid chat ID:', req.params.chatId);
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const messages = await chatService.getChatMessages(chatId);
      console.log(`Found ${messages.length} messages for chat ${chatId}`);
      
      res.json(messages);
    } catch (error: any) {
      console.error("Error getting chat messages:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while fetching chat messages.",
      });
    }
  },

  uploadImage: async (req: MulterRequest, res: Response) => {
  try {
    console.log('--- UPLOAD IMAGE REQUEST ---');

    if (!req.file) {
      console.error('No image file provided');
      return res.status(400).json({ error: "No image file provided" });
    }

    const imageFile = req.file as Express.Multer.File & { path?: string; filename?: string; };
    const cloudinaryUrl = (imageFile as any).path;

    console.log('Image uploaded to Cloudinary:', cloudinaryUrl);

    res.status(200).json({ imageUrl: cloudinaryUrl });
  } catch (error: any) {
    console.error("Image upload error:", error.message, error.stack);
    res.status(500).json({ error: `Image upload failed: ${error.message}` });
  }
},

};
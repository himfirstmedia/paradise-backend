import { Request, Response } from 'express';
import { chatService } from '../services/chatService';
import { Prisma } from "@prisma/client";
import prisma from 'config/prisma';

export const chatController = {
  // controllers/chatController.ts
createChat: async (req: Request, res: Response) => {
  try {
    const { participantIds, houseIds, isGroup, name } = req.body;

    if (!participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'participantIds is required and must be an array' });
    }

    if (isGroup && participantIds.length < 1) {
      return res.status(400).json({ error: 'Group chat must have at least 1 participant' });
    }

    if (!isGroup && participantIds.length !== 2) {
      return res.status(400).json({ error: 'Individual chat must have exactly 2 participants' });
    }

    if (!isGroup) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          users: {
            every: {
              userId: { in: participantIds }
            }
          }
        }
      });

      if (existingChat) return res.status(200).json(existingChat);
    }

    // ✅ Check if group chat with same houseIds exists
    if (isGroup && houseIds && houseIds.length > 0) {
      const existingGroupChats = await prisma.chat.findMany({
        where: {
          isGroup: true,
        },
        include: {
          house: true,
        }
      });

      const matchingChat = existingGroupChats.find(chat => {
        const chatHouseIds = chat.house ? [chat.house.id] : [];
        const requestHouseIds = [...houseIds].sort();
        return JSON.stringify(chatHouseIds) === JSON.stringify(requestHouseIds);
      });

      if (matchingChat) return res.status(200).json(matchingChat);
    }

    // ✅ Generate chat name using house abbreviation(s)
    let chatName = name;
    if (!chatName && isGroup && houseIds?.length) {
      const houses = await prisma.house.findMany({
        where: { id: { in: houseIds } },
        select: { abbreviation: true }
      });

      chatName = houses.map(h => h.abbreviation).join(' & ');
    }

    const chatData: Prisma.chatCreateInput = {
      name: chatName ?? "Group Chat",
      isGroup,
      users: {
        create: participantIds.map((userId: number) => ({ userId }))
      },
      house: houseIds && houseIds.length > 0 ? { connect: { id: houseIds[0] } } : undefined
    };

    const chat = await chatService.createChat(chatData);
    res.status(201).json(chat);
  } catch (error: any) {
    console.error("Error creating chat:", error);
    res.status(500).json({
      message: error?.message || "An error occurred while creating the chat.",
    });
  }
},


  getChat: async (req: Request, res: Response) => {
    try {
      const chatId = Number(req.params.id);
      console.log('--- GET CHAT REQUEST ---');
      console.log('Chat ID:', chatId);
      
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
      console.log('--- GET USER CHATS REQUEST ---');
      console.log('User ID:', userId);
      
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
      console.log('--- SEND MESSAGE REQUEST ---');
      console.log('Request Body:', req.body);
      
      const { chatId, senderId, content, image } = req.body;
      const message = await chatService.createMessage({
        chat: { connect: { id: chatId } },
        sender: { connect: { id: senderId } },
        content,
        image: image || null
      });
      
      console.log('Message sent successfully:', message);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while sending the message.",
      });
    }
  },

  addToGroup: async (req: Request, res: Response) => {
    try {
      const { chatId, userId } = req.body;
      const chat = await chatService.findChatById(chatId);
      
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      
      if (!chat.isGroup) {
        return res.status(400).json({ error: 'Cannot add to individual chat' });
      }
      
      const result = await chatService.addUserToChat(chatId, userId);
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
      await chatService.markMessagesAsRead(chatId, userId);
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
      if (isNaN(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const messages = await chatService.getChatMessages(chatId);
      res.json(messages);
    } catch (error: any) {
      console.error("Error getting chat messages:", error);
      res.status(500).json({
        message: error?.message || "An error occurred while fetching chat messages.",
      });
    }
  }
};
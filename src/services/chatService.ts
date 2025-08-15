import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

export const chatService = {
  createChat: async (data: Prisma.ChatCreateInput) => {
    const createdChat = await prisma.chat.create({
      data,
      include: {
        users: {
          include: { user: true }
        },
        house: true
      }
    });
    return await chatService.findChatById(createdChat.id);
  },

  findChatById: (id: number) => {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        users: {
          include: { user: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: true }
        }
      }
    });
  },

  findUserChats: async (userId: number) => {
    try {
      return await prisma.chat.findMany({
        where: {
          users: {
            some: { userId }
          }
        },
        include: {
          users: {
            include: { user: true }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: true } // Add sender include
          },
          house: true // Include house for houseId
        }
      });
    } catch (error) {
      console.error('Error finding user chats:', error);
      throw error;
    }
  },

  createMessage: (data: Prisma.MessageCreateInput) => {
    return prisma.message.create({
      data,
      include: { sender: true }
    });
  },

  addUserToChat: (chatId: number, userId: number) => {
    return prisma.chatUser.create({
      data: { chatId, userId },
      include: { chat: true, user: true }
    });
  },

  markMessagesAsRead: (chatId: number, userId: number) => {
    return prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId }
      },
      data: {
        readBy: { push: userId }
      }
    });
  },

  getChatMessages: (chatId: number) => {
    return prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      include: { sender: true }
    });
  }
};
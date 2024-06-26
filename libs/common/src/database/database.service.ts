import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { updateUserRequest } from 'apps/shelter-accounts/src/users/dto/updateUser.request';
import { CreateFileDto } from './dto/create-file.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { CreateLobbyContestantDto } from './dto/create-lobby-contestant.dto';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateUserProductDto } from './dto/create-user-product.dto';

@Injectable()
export class DatabaseService {
  constructor(private readonly prisma: PrismaService) {}

  //  -----------
  //  USERS TABLE
  //  -----------

  async createUser(user: CreateUserDto) {
    return await this.prisma.users.create({
      data: user,
    });
  }

  async updateUser(userId: string, data: updateUserRequest) {
    return await this.prisma.users.update({
      where: { id: userId },
      data: data,
    });
  }

  async deleteUser(userId: string) {
    // Check if the user exists
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Delete the user
    return await this.prisma.users.delete({
      where: { id: userId },
    });
  }

  async getUserByIdOrNull(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return null;
    }
    return user;
  }

  async getUserByEmail(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      new Error(`User with email ${email} not found`);
    }

    return user || null;
  }

  //  -----------
  //  PAYMENTS TABLE
  //  -----------

  async createPayment(payment: CreatePaymentDto) {
    return await this.prisma.payments.create({
      data: payment,
    });
  }

  async updatePayment(id: string, data: { status?: string }) {
    return await this.prisma.payments.update({
      where: { id: id },
      data: data,
    });
  }

  async getPaymentByExternalId(externalId: string) {
    const payment = await this.prisma.payments.findFirst({
      where: { externalId: externalId },
    });
    if (!payment) {
      throw new Error(`Payment with externalId ${externalId} not found`);
    }
    return payment;
  }

  //  -----------
  //  USER_PRODUCTS TABLE
  //  -----------

  async createUserProduct(userProduct: CreateUserProductDto) {
    return await this.prisma.userProducts.create({
      data: userProduct,
    });
  }

  async getUserProductsByUserId(userId: string) {
    const userProducts = await this.prisma.userProducts.findMany({
      where: { userId: userId },
    });
    return userProducts;
  }

  //  -----------
  //  FILES TABLE
  //  -----------

  async createFile(file: CreateFileDto) {
    return await this.prisma.files.create({
      data: file,
    });
  }

  async deleteFile(fileId: string) {
    const file = await this.prisma.files.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`);
    }

    return await this.prisma.files.delete({
      where: { id: fileId },
    });
  }

  async getFileById(fileId: string) {
    const file = await this.prisma.files.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    return file;
  }

  async getFilesByUserId(userId: string, type: string = null) {
    const files = await this.prisma.files.findMany({
      where: { userId: userId, type: type },
    });
    if (!files) {
      return null;
    }
    return files;
  }

  //  -----------
  //  LOBBIES TABLE
  //  -----------

  async createLobby(lobby: CreateLobbyDto) {
    const data = {
      key: lobby.key,
      organizatorId: lobby.organizatorId,
      settings: JSON.stringify(lobby.settings),
    };
    return await this.prisma.lobbies.create({
      data: data,
    });
  }

  async updateLobbyByKey(key: string, data: any) {
    const lobbyByKey = await this.getLobbyByKeyOrNull(key);
    if (!lobbyByKey) {
      throw new Error(`Lobby with key ${key} not found`);
    }

    const lobby = await this.getLobbyByIdOrNull(lobbyByKey.id);

    // Merge objects manually
    const newSettings = {
      maxClients:
        data.settings.maxClients !== undefined
          ? data.settings.maxClients
          : lobby.settings.maxClients,
      isPrivate:
        data.settings.isPrivate !== undefined
          ? data.settings.isPrivate
          : lobby.settings.isPrivate,
      timer:
        data.settings.timer !== undefined
          ? data.settings.timer
          : lobby.settings.timer,
      isAllowBots:
        data.settings.isAllowBots !== undefined
          ? data.settings.isAllowBots
          : lobby.settings.isAllowBots,
    };

    // Update lobby settings with the merged object
    lobby.settings = JSON.stringify(newSettings);

    return await this.prisma.lobbies.update({
      where: { id: lobby.id },
      data: lobby,
    });
  }

  async deleteLobby(lobbyKey: string): Promise<boolean> {
    try {
      const lobby = await this.getLobbyByKeyOrNull(lobbyKey);
      if (!lobby) {
        throw new Error(`Lobby with key:${lobby.key} not found`);
      }

      await this.prisma.activityLogs.deleteMany({
        where: { lobbyId: lobbyKey },
      });
      await this.prisma.chatMessages.deleteMany({
        where: { lobbyId: lobbyKey },
      });
      await this.prisma.lobbies.delete({
        where: { id: lobby.id },
      });
      return true;
    } catch (error) {
      console.error(`Error deleting lobby with key:${lobbyKey}:`, error);
      throw new Error(`Failed to delete lobby with key:${lobbyKey}`);
    }
  }

  async getLobbyByIdOrNull(lobbyId: string): Promise<any> {
    const lobby = await this.prisma.lobbies.findUnique({
      where: { id: lobbyId },
    });
    if (!lobby) {
      return null;
    }
    lobby.settings = JSON.parse(lobby.settings);
    return lobby;
  }

  async getLobbyByKeyOrNull(key: string): Promise<any> {
    const lobby = await this.prisma.lobbies.findFirst({
      where: { key: key },
    });
    if (!lobby) {
      return null;
    }
    lobby.settings = JSON.parse(lobby.settings);
    return lobby;
  }

  async getAllPublicLobbis() {
    const lobbies = await this.prisma.lobbies.findMany();
    const res = lobbies.filter(
      (lobby) => JSON.parse(lobby.settings).isPrivate === false,
    );
    return res;
  }

  //  -----------
  //  LOBBY_CONTESTANTS TABLE
  //  -----------

  async createLobbyConstantent(lobbyContestant: CreateLobbyContestantDto) {
    return await this.prisma.lobbyContestants.create({
      data: lobbyContestant,
    });
  }

  async deleteLobbyConstantent(contestantId: string) {
    const contestant = await this.prisma.lobbyContestants.findUnique({
      where: { id: contestantId },
    });
    if (!contestant) {
      throw new Error(`Contestant with ID ${contestantId} not found`);
    }

    return await this.prisma.lobbyContestants.delete({
      where: { id: contestantId },
    });
  }

  async getLobbyConstantentById(contestantId: string) {
    const contestant = await this.prisma.lobbyContestants.findUnique({
      where: { id: contestantId },
    });
    if (!contestant) {
      throw new Error(`Contestant with ID ${contestantId} not found`);
    }
    return contestant;
  }

  //  -----------
  //  CHAR_MESSAGES TABLE
  //  -----------

  async createChatMessage(message: CreateChatMessageDto) {
    return await this.prisma.chatMessages.create({
      data: message,
    });
  }

  async deleteChatMessage(messageId: string) {
    const message = await this.prisma.chatMessages.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    return await this.prisma.chatMessages.delete({
      where: { id: messageId },
    });
  }

  async clearLobbyChat(lobbyId: string) {
    const result = await this.prisma.chatMessages.deleteMany({
      where: { lobbyId: lobbyId },
    });

    return result; // will return an object that includes a count of the deleted records
  }

  async getChatMessagesByLobbyId(lobbyId: string) {
    const messages = await this.prisma.chatMessages.findMany({
      where: { lobbyId: lobbyId },
    });
    if (!messages || messages.length === 0) {
      return [];
    }
    return messages;
  }

  async getChatMessagesByMentionId(mentionId: string) {
    const messages = await this.prisma.chatMessages.findMany({
      where: { mentionId: mentionId },
    });
    if (!messages || messages.length === 0) {
      return null;
    }
    return messages;
  }

  async getChatMessageByReplyTo(replyTo: string) {
    const messages = await this.prisma.chatMessages.findMany({
      where: { replyTo: replyTo },
    });
    return messages[0] || null;
  }

  async getChatMessageById(messageId: string) {
    const message = await this.prisma.chatMessages.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`);
    }
    return message;
  }

  //  -----------
  //  ACTIVITY_LOGS TABLE
  //  -----------

  async createActivityLog(activityLog: CreateActivityLogDto) {
    activityLog.payload = JSON.stringify(activityLog.payload);
    return await this.prisma.activityLogs.create({
      data: activityLog,
    });
  }

  async getActivityLogsByLobbyId(userId: string, lobbyId: string) {
    const activityLogs = await this.prisma.activityLogs.findMany({
      where: { lobbyId: lobbyId },
    });
    if (activityLogs.length === 0) {
      return [];
    }

    for (const log of activityLogs) {
      log.payload = JSON.parse(log.payload);
    }
    return activityLogs;
  }
}

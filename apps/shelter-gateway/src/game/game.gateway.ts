import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsResponse,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes } from '@nestjs/common';
import { DatabaseService, AIService } from '@app/common';
import { WsValidationPipe } from '../websocket/ws.validation-pipe';
import { LobbyManager } from './lobby/lobby.manager';
import { AuthenticatedSocket } from './types';
import { ServerException } from './server.exception';

import { ClientEvents } from './utils/ClientEvents';
import { ServerEvents } from './utils/ServerEvents';
import { SocketExceptions } from './utils/SocketExceptions';

import { LobbyCreateDto } from './dto/LobbyCreate';
import { LobbyJoinDto } from './dto/LobbyJoin';
import { ChatMessage } from './dto/ChatMessage';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { isset, getTime, getRandomGreeting, getRandomIndex } from 'helpers';
import { constants } from '@app/common';

@UsePipes(new WsValidationPipe())
@WebSocketGateway()
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger: Logger = new Logger(GameGateway.name);
  constructor(
    private readonly lobbyManager: LobbyManager,
    private readonly databaseService: DatabaseService,
    private readonly AIService: AIService,
    private readonly activityLogsService: ActivityLogsService,
  ) {
    this.lobbyManager.setDatabaseService(databaseService);
  }

  @SubscribeMessage('signal')
  handleSignal(client: Socket, payload: { signal: any; type: string }) {
    console.log(`signal`);
    client.broadcast.emit('signal', payload);
  }

  afterInit(server: Server): any {
    this.lobbyManager.server = server; // Pass server instance to managers
    this.logger.log('Game server initialized !');
  }
  async handleConnection(client: Socket, ...args: any[]): Promise<void> {
    this.lobbyManager.initializeSocket(client as AuthenticatedSocket); // Call initializers to set up socket
  }
  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    this.lobbyManager.terminateSocket(client); // Handle termination of socket
  }

  @SubscribeMessage(ClientEvents.Ping)
  onPing(client: AuthenticatedSocket): void {
    client.emit(ServerEvents.Pong, {
      message: 'pong',
    });
  }

  @SubscribeMessage(ClientEvents.ChatMessage)
  onChatMessage(client: AuthenticatedSocket, data: ChatMessage) {
    if (!client.data.lobby) {
      throw new ServerException(
        SocketExceptions.LobbyError,
        'You are not in a lobby',
      );
    }
    client.data.lobby.instance.sendChatMessage(data, client);
  }

  @SubscribeMessage(ClientEvents.LobbyCreate)
  async onLobbyCreate(
    client: AuthenticatedSocket,
    data: LobbyCreateDto,
  ): Promise<
    WsResponse<{ message: string; color?: 'green' | 'red' | 'blue' | 'orange' }>
  > {
    const lobby = this.lobbyManager.createLobby(
      data.maxClients,
      this.databaseService,
      this.AIService,
      this.activityLogsService,
    );

    // data.player.socketId = client.id  // Cannot set properties of undefined (setting 'socketId')
    lobby.addClient(client);

    // store lobby in database
    const context = {
      key: lobby.id,
      organizatorId: data.organizatorId,
      settings: { maxClients: data.maxClients, isPrivate: true, timer: 0 },
    };
    await this.databaseService.createLobby(context);

    return {
      event: ServerEvents.GameMessage,
      data: {
        color: 'green',
        message: 'Lobby created',
      },
    };
  }

  @SubscribeMessage(ClientEvents.LobbyUpdate)
  async onLobbyUpdate(client: AuthenticatedSocket, data: any): Promise<any> {
    let isPrivate, maxClients, timer, isAllowBots;
    if (isset(data.isPrivate)) {
      client.data.lobby.isPrivate = data.isPrivate;
      isPrivate = data.isPrivate;
    }
    if (isset(data.maxClients)) {
      client.data.lobby.maxClients = data.maxClients;
      maxClients = data.maxClients;
    }
    if (isset(data.timer)) {
      client.data.lobby.timer = data.timer;
      timer = data.timer;
    }
    if (data.isAllowBots === true) {
      client.data.lobby.isAllowBots = data.isAllowBots;
      isAllowBots = data.isAllowBots;

      // TODO: make join all avaliable

      // join bot to lobby
      const playerBot =
        constants.allBots[getRandomIndex(constants.allBots.length)];
      this.lobbyManager.joinLobby(data.key, client, playerBot);

      // greeting
      client.data.lobby.instance.sendChatMessage(
        {
          sender: playerBot.displayName,
          senderId: playerBot.userId,
          message: getRandomGreeting(playerBot.greetings),
          avatar: playerBot.avatar,
          timeSent: getTime(),
        },
        client,
      );
    }

    // update lobby in database
    await this.databaseService.updateLobbyByKey(data.key, {
      settings: { isPrivate, maxClients, timer, isAllowBots },
    });

    return {
      event: ServerEvents.GameMessage,
      data: {
        color: 'green',
        message: 'Lobby updated',
      },
    };
  }

  @SubscribeMessage(ClientEvents.LobbyJoin)
  onLobbyJoin(client: AuthenticatedSocket, data: LobbyJoinDto): void {
    this.lobbyManager.joinLobby(data.lobbyId, client, data.player);
  }

  @SubscribeMessage(ClientEvents.LobbyLeave)
  onLobbyLeave(client: AuthenticatedSocket, data: { userId?: string }): void {
    client.data.lobby?.removeClient(client, data);
  }

  @SubscribeMessage(ClientEvents.GameStart)
  onGameStart(client: AuthenticatedSocket, data: any): void {
    client.data.lobby.instance.triggerStart(data, client);
  }

  @SubscribeMessage(ClientEvents.GameVoteKick)
  async onVoteKick(client: AuthenticatedSocket, data: any): Promise<void> {
    if (!client.data.lobby) {
      throw new ServerException(
        SocketExceptions.LobbyError,
        'You are not in a lobby',
      );
    }

    client.data.lobby.instance.voteKick(data, client);
  }

  @SubscribeMessage(ClientEvents.GameUseSpecialCard)
  async onUseSpecialCard(
    client: AuthenticatedSocket,
    data: any,
  ): Promise<void> {
    if (!client.data.lobby) {
      throw new ServerException(
        SocketExceptions.LobbyError,
        'You are not in a lobby',
      );
    }

    client.data.lobby.instance.useSpecialCard(data, client);
  }

  @SubscribeMessage(ClientEvents.GameRevealChar)
  async onRevealChar(client: AuthenticatedSocket, data: any): Promise<void> {
    if (!client.data.lobby) {
      throw new ServerException(
        SocketExceptions.LobbyError,
        'You are not in a lobby',
      );
    }

    client.data.lobby.instance.revealChar(data, client);
  }

  @SubscribeMessage(ClientEvents.GameEndTurn)
  onEndTurn(client: AuthenticatedSocket, data: any): void {
    client.data.lobby.instance.endTurn(data, client);
  }
}

import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from '../types';
import { Instance } from '../instance/instance';
import { ServerEvents } from '../utils/ServerEvents';
import { ServerPayloads } from '../utils/ServerPayloads';
import { generateSixSymbolHash } from 'helpers';
import { AIService, DatabaseService } from '@app/common';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';

export class Lobby {
  public readonly id: string = generateSixSymbolHash();
  public readonly createdAt: Date = new Date();
  public readonly clients: Map<Socket['id'], AuthenticatedSocket> = new Map<
    Socket['id'],
    AuthenticatedSocket
  >();
  public readonly instance: Instance = new Instance(this);
  public isPrivate: boolean = true;
  public timer: number = 0;
  public isAllowBots: boolean = false;
  public organizatorId: string;
  public readonly databaseService = this._databaseService;
  public readonly AIService = this._AIService;
  public readonly activityLogsService = this._activityLogsService;

  constructor(
    private readonly server: Server,
    public maxClients: number,
    private readonly _databaseService: DatabaseService,
    private readonly _AIService: AIService,
    private readonly _activityLogsService: ActivityLogsService,
  ) {}

  public addClient(client: AuthenticatedSocket, playerData: any = {}): void {
    this.clients.set(client.id, client);
    client.join(this.id);
    client.data.lobby = this;

    let players = this.instance.players;
    const index = players.findIndex(
      (obj: { socketId: any }) => obj.socketId === playerData.id,
    );
    if (index !== -1) {
      players[index] = { ...playerData };
    } else {
      players.push({ ...playerData, isOrganizator: true }); // TODO: FIX !!!
    }
    players = players.filter((obj: object) => Object.keys(obj).length > 1);
    players = Array.from(
      new Map(
        players.map((obj: { userId: any }) => [obj.userId, obj]),
      ).values(),
    ); // remove dublicates
    this.instance.players = players;

    this.dispatchLobbyState();
  }

  public removeClient(
    client: AuthenticatedSocket,
    data: { userId?: string } = {},
  ): void {
    // should work only for bot remove action
    if (data.userId) {
      this.instance.players = this.instance.players.filter(
        (p) => p.userId !== data.userId,
      );
      return this.dispatchLobbyState();
    }

    this.clients.delete(client.id);
    client.leave(this.id);
    client.data.lobby = null;

    if (!this.instance.hasStarted) {
      this.instance.players = this.instance.players.filter(
        (p) => p.socketId !== client.id,
      );
    }

    // TODO: suspend the game if started or use bot instead of player

    // Alert the remaining player that client left lobby
    this.dispatchToLobby<ServerPayloads[ServerEvents.GameMessage]>(
      ServerEvents.GameMessage,
      {
        color: 'blue',
        message: 'Opponent left lobby',
      },
    );

    this.dispatchLobbyState();
  }

  public dispatchLobbyState(): void {
    const payload: ServerPayloads[ServerEvents.LobbyState] = {
      lobbyId: this.id,
      hasStarted: this.instance.hasStarted,
      hasFinished: this.instance.hasFinished,
      playersCount: this.clients.size,
      isSuspended: this.instance.isSuspended,
      players: this.instance.players,
      characteristics: this.instance.characteristics,
      specialCards: this.instance.specialCards,
      conditions: this.instance.conditions,
      maxClients: this.maxClients,
      isPrivate: this.isPrivate,
      timer: this.timer,
      isAllowBots: this.isAllowBots,
      currentStage: this.instance.currentStage,
      stages: this.instance.stages,
      revealPlayerId: this.instance.revealPlayerId,
      voteKickList: this.instance.voteKickList,
      kickedPlayers: this.instance.kickedPlayers,
      timerEndTime: this.instance.timerEndTime,
      finalPrediction: this.instance.finalPrediction,
    };

    this.dispatchToLobby(ServerEvents.LobbyState, payload);
  }

  public dispatchToLobby<T>(event: ServerEvents, payload: T): void {
    this.server.to(this.id).emit(event, payload);
  }
}

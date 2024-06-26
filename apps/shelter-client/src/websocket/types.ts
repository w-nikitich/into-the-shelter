export enum SocketExceptions {
  UnexpectedError = 'exception.unexpected_error',
  UnexpectedPayload = 'exception.unexpected_payload',
  LobbyError = 'exception.lobby.error',
  GameError = 'exception.game.error',
}
export type ServerExceptionResponse = {
  exception: SocketExceptions;
  message?: string | object;
};

export enum ServerEvents {
  Pong = 'server.pong',
  ChatMessage = 'server.chat.message',
  LobbyState = 'server.lobby.state',
  GameMessage = 'server.game.message',
}
export type ServerPayloads = {
  [ServerEvents.LobbyState]: {
    lobbyLink: string;
    isOrganizator: boolean | undefined;
    lobbyId: string;
    hasStarted: boolean;
    hasFinished: boolean;
    playersCount: number;
    isSuspended: boolean;
    players: any;
    characteristics: any;
    specialCards: any;
    conditions: any;
    currentStage: number;
    stages: any[];
    revealPlayerId: string;
    voteKickList: any;
    kickedPlayers: string[];
    timer: number;
    isAllowBots: boolean;
    timerEndTime: number | null;
    finalPrediction: string;
  };

  [ServerEvents.GameMessage]: {
    message: string;
    color?: 'green' | 'red' | 'blue' | 'orange';
  };
};

export enum ClientEvents {
  Ping = 'client.ping',
  LobbyCreate = 'client.lobby.create',
  LobbyUpdate = 'client.lobby.update',
  LobbyJoin = 'client.lobby.join',
  LobbyLeave = 'client.lobby.leave',
  GameStart = 'client.game.start',
  GameRevealChar = 'client.game.reveal_char', // characteristic, i.e: gender, health etc..
  GameEndTurn = 'client.game.end_turn',
  GameVoteKick = 'client.game.vote_kick',
  GameUseSpecialCard = 'client.game.use_special_card',
}

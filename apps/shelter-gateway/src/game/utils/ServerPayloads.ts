import { ServerEvents } from './ServerEvents';

export type ServerPayloads = {
  [ServerEvents.LobbyState]: {
    lobbyId: string;
    hasStarted: boolean;
    hasFinished: boolean;
    playersCount: number;
    isSuspended: boolean;
    players: any;
    characteristics: any;
    specialCards: any;
    conditions: any;
    maxClients: number;
    isPrivate: boolean;
    timer: number;
    isAllowBots: boolean;
    currentStage: number;
    stages: any[];
    revealPlayerId: string;
    voteKickList: any[];
    kickedPlayers: string[];
    timerEndTime: number;
    finalPrediction: string;
  };

  [ServerEvents.GameMessage]: {
    message: string;
    color?: 'green' | 'red' | 'blue' | 'orange';
  };
};

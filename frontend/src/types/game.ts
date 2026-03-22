export type GameMode = 'normal' | 'timed';
export type GameStatus = 'active' | 'completed' | 'abandoned';

export interface Game {
  id: string;
  challengeId?: string;
  player1Id: string;
  player1Name: string;
  player1Symbol: string; // "X" or "O"
  player2Id: string;
  player2Name: string;
  player2Symbol: string; // "X" or "O"
  board: string[]; // Array of 9 cells
  currentTurn: number; // 1 or 2
  status: GameStatus;
  mode: GameMode;
  moveTimeLimit: number; // Seconds (0 = unlimited)
  firstTo: number; // First to X wins
  player1Score: number;
  player2Score: number;
  currentRound: number;
  winnerId: string | null;
  lastMoveAt: number; // Unix timestamp
  createdAt: number; // Unix timestamp
  completedAt?: number;
}

export interface SSEEvent {
  type: string;
  payload?: any;
}

export interface MoveRequest {
  gameId: string;
  playerId: string;
  position: number; // 0-8
}

export interface User {
  email: string;
  name: string;
}

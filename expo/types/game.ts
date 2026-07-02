export interface Player {
  id: string;
  name: string;
  number: string;
  teamId: string;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  players: Player[];
}

export type GameStatus = 'live' | 'final' | 'upcoming' | 'halftime';

export interface GameScore {
  home: number;
  away: number;
}

export interface Game {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  score: GameScore;
  status: GameStatus;
  period: number;
  gameTime: string;
  date: string;
  time: string;
  pointNumber: number;
}

export type EventType = 'goal' | 'timeout' | 'halftime' | 'game_start' | 'game_end';

export interface GameEvent {
  id: string;
  type: EventType;
  teamId?: string;
  teamName?: string;
  scorerNumber?: string;
  scorerName?: string;
  assistNumber?: string;
  assistName?: string;
  gameTime: string;
  gameClockSeconds?: number;
  scoreAtEvent?: GameScore;
  description?: string;
  isSynced: boolean;
  // Timeout-specific fields (type === 'timeout'). `gameTime`/`gameClockSeconds`
  // above hold the timeout START time; these hold the end/running state.
  isTimeoutActive?: boolean;
  timeoutEndTime?: string;
  timeoutEndSeconds?: number;
  timeoutDurationSeconds?: number;
  // Halftime-specific fields (type === 'halftime'). `gameTime`/`gameClockSeconds`
  // above hold the halftime START time (always the last goal's time); these
  // hold the end/running state.
  isHalftimeActive?: boolean;
  halftimeEndTime?: string;
  halftimeEndSeconds?: number;
  halftimeDurationSeconds?: number;
}

export interface SeasonSummary {
  totalGames: number;
  winRate: number;
  totalPoints: number;
  avgScore: number;
}

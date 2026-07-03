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
  // Raw (unrounded) elapsed-seconds captured at the moment the triggering
  // button was pressed. Drives live running-timer displays so they start
  // ticking immediately, while `gameClockSeconds` keeps the rounded-to-10s
  // value used for the log/backend.
  startElapsedSeconds?: number;
  scoreAtEvent?: GameScore;
  description?: string;
  isSynced: boolean;
  // Timeout-specific fields (type === 'timeout'). `gameTime`/`gameClockSeconds`
  // above hold the timeout START time; these hold the end/running state.
  isTimeoutActive?: boolean;
  timeoutEndTime?: string;
  timeoutEndSeconds?: number;
  timeoutDurationSeconds?: number;
  // True when this timeout was started while still in the between-points
  // window (i.e. before the next point had resumed play).
  isBetweenPointsTimeout?: boolean;
  // Halftime-specific fields (type === 'halftime'). `gameTime`/`gameClockSeconds`
  // above hold the halftime START time (always the last goal's time); these
  // hold the end/running state.
  isHalftimeActive?: boolean;
  halftimeEndTime?: string;
  halftimeEndSeconds?: number;
  // Raw (unrounded) elapsed-seconds captured when halftime ended — lets
  // "time between points" resume ticking immediately afterward instead of
  // waiting for the rounded `halftimeEndSeconds` value.
  halftimeEndElapsedSeconds?: number;
  halftimeDurationSeconds?: number;
}

export interface SeasonSummary {
  totalGames: number;
  winRate: number;
  totalPoints: number;
  avgScore: number;
}

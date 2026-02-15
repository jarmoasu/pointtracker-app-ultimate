import { Game, GameEvent, SeasonSummary } from '@/types/game';
import { Team } from '@/types/game';

export const mockTeams: Team[] = [];

export const mockGames: Game[] = [];

export const mockGameEvents: GameEvent[] = [];

export const mockSeasonSummary: SeasonSummary = {
  totalGames: 0,
  winRate: 0,
  totalPoints: 0,
  avgScore: 0,
};

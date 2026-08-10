import type { GameEvent, Player } from '@/types/game';

export interface PlayerStatLine {
  player: Player;
  goals: number;
  assists: number;
  points: number;
}

function findMatchingPlayer(
  players: Player[],
  name: string | undefined,
  number: string | undefined,
): Player | undefined {
  if (!name && !number) return undefined;
  return (
    players.find((player) => player.name === (name ?? '') && player.number === (number ?? '')) ??
    (number ? players.find((player) => player.number === number) : undefined)
  );
}

// Computes per-player goal/assist/point totals for a roster from a game's
// event log. Goal events only carry the scorer/assist name+number (no player
// id), so players are matched back to the roster by name+number, falling
// back to number alone if the name doesn't match (e.g. player was renamed).
export function computePlayerStats(players: Player[], events: GameEvent[]): PlayerStatLine[] {
  const totals = new Map<string, { goals: number; assists: number }>();
  players.forEach((player) => totals.set(player.id, { goals: 0, assists: 0 }));

  events
    .filter((event) => event.type === 'goal')
    .forEach((event) => {
      const scorer = findMatchingPlayer(players, event.scorerName, event.scorerNumber);
      if (scorer) totals.get(scorer.id)!.goals += 1;

      const assist = findMatchingPlayer(players, event.assistName, event.assistNumber);
      if (assist) totals.get(assist.id)!.assists += 1;
    });

  return players
    .map((player) => {
      const { goals, assists } = totals.get(player.id) ?? { goals: 0, assists: 0 };
      return { player, goals, assists, points: goals + assists };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.player.name.localeCompare(b.player.name);
    });
}

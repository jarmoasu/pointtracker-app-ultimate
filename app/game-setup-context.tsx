import { useCallback, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';

import { Player, Team } from '@/types/game';

export type TeamSide = 'home' | 'away';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const [GameSetupProvider, useGameSetup] = createContextHook(() => {
  const [homeTeamName, setHomeTeamName] = useState<string>('');
  const [awayTeamName, setAwayTeamName] = useState<string>('');
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);

  const addPlayer = useCallback(
    (side: TeamSide, name: string, number: string) => {
      const newPlayer: Player = {
        id: createId(),
        name,
        number,
        teamId: side === 'home' ? 'home' : 'away',
      };

      if (side === 'home') {
        setHomePlayers((prev) => [...prev, newPlayer]);
      } else {
        setAwayPlayers((prev) => [...prev, newPlayer]);
      }

      console.log('GameSetup add player', { side, name, number });
      return newPlayer;
    },
    [],
  );

  const updatePlayer = useCallback(
    (side: TeamSide, playerId: string, updates: Partial<Pick<Player, 'name' | 'number'>>) => {
      const updater = (players: Player[]) =>
        players.map((player) =>
          player.id === playerId
            ? {
                ...player,
                name: updates.name ?? player.name,
                number: updates.number ?? player.number,
              }
            : player,
        );

      if (side === 'home') {
        setHomePlayers(updater);
      } else {
        setAwayPlayers(updater);
      }

      console.log('GameSetup update player', { side, playerId, updates });
    },
    [],
  );

  const removePlayer = useCallback((side: TeamSide, playerId: string) => {
    const updater = (players: Player[]) => players.filter((player) => player.id !== playerId);

    if (side === 'home') {
      setHomePlayers(updater);
    } else {
      setAwayPlayers(updater);
    }

    console.log('GameSetup remove player', { side, playerId });
  }, []);

  const homeTeam = useMemo<Team>(
    () => ({
      id: 'home',
      name: homeTeamName.trim() || 'Home Team',
      abbreviation: homeTeamName.trim().slice(0, 3).toUpperCase() || 'HOM',
      color: '#2196F3',
      players: homePlayers,
    }),
    [homeTeamName, homePlayers],
  );

  const awayTeam = useMemo<Team>(
    () => ({
      id: 'away',
      name: awayTeamName.trim() || 'Away Team',
      abbreviation: awayTeamName.trim().slice(0, 3).toUpperCase() || 'AWY',
      color: '#1A2138',
      players: awayPlayers,
    }),
    [awayTeamName, awayPlayers],
  );

  return {
    homeTeamName,
    awayTeamName,
    homePlayers,
    awayPlayers,
    homeTeam,
    awayTeam,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    updatePlayer,
    removePlayer,
  };
});

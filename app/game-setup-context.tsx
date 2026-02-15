import { useCallback, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';

import { GameEvent, Player, Team } from '@/types/game';

export type TeamSide = 'home' | 'away';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const [GameSetupProvider, useGameSetup] = createContextHook(() => {
  const [homeTeamName, setHomeTeamName] = useState<string>('');
  const [awayTeamName, setAwayTeamName] = useState<string>('');
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [liveEvents, setLiveEvents] = useState<GameEvent[]>([]);
  const hasHalftimeEvent = useMemo<boolean>(
    () => liveEvents.some((event) => event.type === 'halftime'),
    [liveEvents],
  );

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

  const addGoalEvent = useCallback(
    (params: {
      side: TeamSide;
      scorer: Player;
      assist?: Player | null;
      gameTime: string;
    }) => {
      const isHome = params.side === 'home';
      const nextHome = isHome ? homeScore + 1 : homeScore;
      const nextAway = isHome ? awayScore : awayScore + 1;
      const team = isHome ? homeTeam : awayTeam;

      const newEvent: GameEvent = {
        id: createId(),
        type: 'goal',
        teamId: team.id,
        teamName: team.name,
        scorerNumber: params.scorer.number,
        scorerName: params.scorer.name,
        assistNumber: params.assist?.number,
        assistName: params.assist?.name,
        gameTime: params.gameTime,
        scoreAtEvent: { home: nextHome, away: nextAway },
        isSynced: false,
      };

      setLiveEvents((prev) => [newEvent, ...prev]);
      setHomeScore(nextHome);
      setAwayScore(nextAway);
      console.log('GameSetup add goal event', { newEvent });
      return newEvent;
    },
    [awayScore, awayTeam, homeScore, homeTeam],
  );

  const addHalftimeEvent = useCallback(
    (params: { gameTime: string }) => {
      if (hasHalftimeEvent) {
        console.log('GameSetup halftime already logged');
        return null;
      }

      const newEvent: GameEvent = {
        id: createId(),
        type: 'halftime',
        gameTime: params.gameTime,
        isSynced: false,
      };

      setLiveEvents((prev) => [newEvent, ...prev]);
      console.log('GameSetup add halftime event', { newEvent });
      return newEvent;
    },
    [hasHalftimeEvent],
  );

  const addTimeoutEvent = useCallback(
    (params: { side: TeamSide; gameTime: string }) => {
      const team = params.side === 'home' ? homeTeam : awayTeam;
      const newEvent: GameEvent = {
        id: createId(),
        type: 'timeout',
        teamId: team.id,
        teamName: team.name,
        gameTime: params.gameTime,
        description: `${team.name} timeout`,
        isSynced: false,
      };

      setLiveEvents((prev) => [newEvent, ...prev]);
      console.log('GameSetup add timeout event', { newEvent });
      return newEvent;
    },
    [awayTeam, homeTeam],
  );

  return {
    homeTeamName,
    awayTeamName,
    homePlayers,
    awayPlayers,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    liveEvents,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    updatePlayer,
    removePlayer,
    addGoalEvent,
    addHalftimeEvent,
    addTimeoutEvent,
    hasHalftimeEvent,
  };
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CaptainSignature, Game, GameEvent, Player, Team } from '@/types/game';

export type TeamSide = 'home' | 'away';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const BACKEND_BASE_URL_KEY = 'pointtracker.backendBaseUrl.v1';
const WRITE_TOKEN_KEY = 'pointtracker.writeToken.v1';
const STREAM_ID_KEY = 'pointtracker.streamId.v1';
const DEVICE_NAME_KEY = 'pointtracker.deviceName.v1';
const PAST_GAMES_KEY = 'pointtracker.pastGames.v1';
const PAST_GAME_EVENTS_KEY = 'pointtracker.pastGameEvents.v1';
const DEFAULT_BACKEND_BASE_URL = 'https://pointtracker-service-ultimate.onrender.com';

function parseClockToSeconds(clock: string): number | null {
  const trimmed = clock.trim();
  const match = /^(\d+):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return minutes * 60 + seconds;
}

export const [GameSetupProvider, useGameSetup] = createContextHook(() => {
  const [backendBaseUrl, setBackendBaseUrlState] = useState<string>(DEFAULT_BACKEND_BASE_URL);
  const [writeToken, setWriteTokenState] = useState<string>('');
  const [streamId, setStreamIdState] = useState<string>('');
  const [deviceName, setDeviceNameState] = useState<string>('');

  const [homeTeamName, setHomeTeamName] = useState<string>('');
  const [awayTeamName, setAwayTeamName] = useState<string>('');
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [liveEvents, setLiveEvents] = useState<GameEvent[]>([]);
  const [isGameEnded, setIsGameEnded] = useState<boolean>(false);
  const [pastGames, setPastGames] = useState<Game[]>([]);
  const [pastGameEvents, setPastGameEvents] = useState<Record<string, GameEvent[]>>({});
  const hasHalftimeEvent = useMemo<boolean>(
    () => liveEvents.some((event) => event.type === 'halftime'),
    [liveEvents],
  );
  const activeTimeoutEvent = useMemo<GameEvent | null>(
    () => liveEvents.find((event) => event.type === 'timeout' && event.isTimeoutActive === true) ?? null,
    [liveEvents],
  );
  const activeHalftimeEvent = useMemo<GameEvent | null>(
    () => liveEvents.find((event) => event.type === 'halftime' && event.isHalftimeActive === true) ?? null,
    [liveEvents],
  );

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [storedBaseUrl, storedWriteToken, storedStreamId, storedDeviceName, storedPastGames, storedPastGameEvents] =
          await Promise.all([
            AsyncStorage.getItem(BACKEND_BASE_URL_KEY),
            AsyncStorage.getItem(WRITE_TOKEN_KEY),
            AsyncStorage.getItem(STREAM_ID_KEY),
            AsyncStorage.getItem(DEVICE_NAME_KEY),
            AsyncStorage.getItem(PAST_GAMES_KEY),
            AsyncStorage.getItem(PAST_GAME_EVENTS_KEY),
          ]);

        if (!isMounted) return;

        if (typeof storedBaseUrl === 'string' && storedBaseUrl.trim()) {
          setBackendBaseUrlState(storedBaseUrl.trim());
        }
        if (typeof storedWriteToken === 'string' && storedWriteToken.trim()) {
          setWriteTokenState(storedWriteToken.trim());
        }
        if (typeof storedStreamId === 'string' && storedStreamId.trim()) {
          setStreamIdState(storedStreamId.trim());
        }
        if (typeof storedDeviceName === 'string' && storedDeviceName.trim()) {
          setDeviceNameState(storedDeviceName.trim());
        }
        if (typeof storedPastGames === 'string') {
          try {
            const parsed = JSON.parse(storedPastGames);
            if (Array.isArray(parsed)) setPastGames(parsed);
          } catch {
            // ignore malformed history
          }
        }
        if (typeof storedPastGameEvents === 'string') {
          try {
            const parsed = JSON.parse(storedPastGameEvents);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setPastGameEvents(parsed);
            }
          } catch {
            // ignore malformed history
          }
        }
      } catch {
        // ignore persisted config hydration failures
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setBackendBaseUrl = useCallback((nextUrl: string) => {
    const trimmed = nextUrl.trim();
    setBackendBaseUrlState(trimmed);
    if (!trimmed) {
      void AsyncStorage.removeItem(BACKEND_BASE_URL_KEY);
      return;
    }
    void AsyncStorage.setItem(BACKEND_BASE_URL_KEY, trimmed);
  }, []);

  const setWriteToken = useCallback((nextToken: string) => {
    const trimmed = nextToken.trim();
    setWriteTokenState(trimmed);
    if (!trimmed) {
      void AsyncStorage.removeItem(WRITE_TOKEN_KEY);
      return;
    }
    void AsyncStorage.setItem(WRITE_TOKEN_KEY, trimmed);
  }, []);

  const setStreamId = useCallback((nextStreamId: string) => {
    const trimmed = nextStreamId.trim();
    setStreamIdState(trimmed);
    if (!trimmed) {
      void AsyncStorage.removeItem(STREAM_ID_KEY);
      return;
    }
    void AsyncStorage.setItem(STREAM_ID_KEY, trimmed);
  }, []);

  const setDeviceName = useCallback((nextDeviceName: string) => {
    const trimmed = nextDeviceName.trim();
    setDeviceNameState(trimmed);
    if (!trimmed) {
      void AsyncStorage.removeItem(DEVICE_NAME_KEY);
      return;
    }
    void AsyncStorage.setItem(DEVICE_NAME_KEY, trimmed);
  }, []);

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
      startElapsedSeconds?: number;
    }) => {
      const isHome = params.side === 'home';
      const nextHome = isHome ? homeScore + 1 : homeScore;
      const nextAway = isHome ? awayScore : awayScore + 1;
      const team = isHome ? homeTeam : awayTeam;

      const gameClockSeconds = parseClockToSeconds(params.gameTime) ?? undefined;
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
        gameClockSeconds,
        startElapsedSeconds: params.startElapsedSeconds,
        scoreAtEvent: { home: nextHome, away: nextAway },
        isSynced: false,
      };

      setLiveEvents((prev) => [newEvent, ...prev]);
      setHomeScore(nextHome);
      setAwayScore(nextAway);
      console.log('GameSetup add goal event', { newEvent });

      const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(
        /\/+$/,
        '',
      );
      const token = writeToken.trim();
      const currentStreamId = streamId.trim();

      if (!token || !currentStreamId) {
        console.log('Result sync skipped (missing write token or streamId)', {
          requestId: `goal-${newEvent.id}`,
        });
        return newEvent;
      }

      void (async () => {
        try {
          const requestId = `goal-${newEvent.id}`;
          const trimmedDeviceName = deviceName.trim();
          const payload = {
            homeTeamName: homeTeam.name,
            awayTeamName: awayTeam.name,
            HomeScore: String(nextHome),
            awayScore: String(nextAway),
            lastScoreTeam: team.name,
            // Backend expects lastScore to identify which side/team scored.
            // Valid values (per backend error): "home" | "away" | homeTeamName | awayTeamName
            lastScore: params.side,
            lastScorer: `${params.scorer.name} #${params.scorer.number}`,
            lastAssist: params.assist ? `${params.assist.name} #${params.assist.number}` : '',
          };

          const res = await fetch(`${normalizedBaseUrl}/streams/${encodeURIComponent(currentStreamId)}/update_result`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'X-Write-Token': token,
              ...(trimmedDeviceName ? { 'X-Device-Name': trimmedDeviceName } : {}),
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            let message = `Request failed (${res.status})`;
            try {
              const raw = await res.text();
              try {
                const errorPayload = JSON.parse(raw);
                if (typeof errorPayload?.message === 'string') message = errorPayload.message;
                if (typeof errorPayload?.error === 'string') message = errorPayload.error;
              } catch {
                const trimmed = raw.trim();
                if (trimmed) message = trimmed;
              }
            } catch {
              // ignore
            }
            throw new Error(message);
          }

          setLiveEvents((prev) =>
            prev.map((ev) => (ev.id === newEvent.id ? { ...ev, isSynced: true } : ev)),
          );
          console.log('Result synced', { requestId, payload });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          console.log('Result sync failed', {
            eventId: newEvent.id,
            requestId: `goal-${newEvent.id}`,
            message,
          });
        }
      })();

      return newEvent;
    },
    [awayScore, awayTeam, backendBaseUrl, deviceName, homeScore, homeTeam, streamId, writeToken],
  );

  // Timeout/halftime signal to the backend: just "this kind of break started"
  // or "it ended" — count-up only, no duration or which-team info, and the
  // main game clock is never touched by this. Fire-and-forget like the goal
  // sync above; if there's no writer session yet this silently no-ops.
  const syncBreakToBackend = useCallback(
    (type: 'timeout' | 'halftime', active: boolean) => {
      const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(
        /\/+$/,
        '',
      );
      const token = writeToken.trim();
      const currentStreamId = streamId.trim();

      if (!token || !currentStreamId) {
        console.log('Break sync skipped (missing write token or streamId)', { type, active });
        return;
      }

      const trimmedDeviceName = deviceName.trim();

      void (async () => {
        try {
          const res = await fetch(
            `${normalizedBaseUrl}/streams/${encodeURIComponent(currentStreamId)}/break`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Write-Token': token,
                ...(trimmedDeviceName ? { 'X-Device-Name': trimmedDeviceName } : {}),
              },
              body: JSON.stringify({ type, active }),
            },
          );

          if (!res.ok) {
            throw new Error(`Request failed (${res.status})`);
          }

          console.log('Break state synced', { type, active });
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          console.log('Break sync failed', { type, active, message });
        }
      })();
    },
    [backendBaseUrl, writeToken, streamId, deviceName],
  );

  const startHalftimeEvent = useCallback(
    (params: { gameTime: string; startElapsedSeconds?: number }) => {
      if (hasHalftimeEvent) {
        console.log('GameSetup halftime already logged');
        return null;
      }
      if (activeTimeoutEvent) {
        console.log('GameSetup cannot start halftime while a timeout is active');
        return null;
      }

      const newEvent: GameEvent = {
        id: createId(),
        type: 'halftime',
        gameTime: params.gameTime,
        gameClockSeconds: parseClockToSeconds(params.gameTime) ?? undefined,
        startElapsedSeconds: params.startElapsedSeconds,
        isHalftimeActive: true,
        isSynced: false,
      };

      setLiveEvents((prev) => [newEvent, ...prev]);
      syncBreakToBackend('halftime', true);
      console.log('GameSetup start halftime event', { newEvent });
      return newEvent;
    },
    [activeTimeoutEvent, hasHalftimeEvent, syncBreakToBackend],
  );

  const endHalftimeEvent = useCallback(
    (eventId: string, params: { gameTime: string; endElapsedSeconds?: number }) => {
      const endSeconds = parseClockToSeconds(params.gameTime) ?? undefined;
      let updatedEvent: GameEvent | null = null;

      setLiveEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId || event.type !== 'halftime' || !event.isHalftimeActive) {
            return event;
          }
          const startSeconds = event.gameClockSeconds;
          const durationSeconds =
            typeof startSeconds === 'number' && typeof endSeconds === 'number'
              ? Math.max(0, endSeconds - startSeconds)
              : undefined;
          const nextEvent: GameEvent = {
            ...event,
            isHalftimeActive: false,
            halftimeEndTime: params.gameTime,
            halftimeEndSeconds: endSeconds,
            halftimeEndElapsedSeconds: params.endElapsedSeconds,
            halftimeDurationSeconds: durationSeconds,
          };
          updatedEvent = nextEvent;
          return nextEvent;
        }),
      );

      if (updatedEvent) {
        syncBreakToBackend('halftime', false);
      }
      console.log('GameSetup end halftime event', { eventId, gameTime: params.gameTime });
      return updatedEvent;
    },
    [syncBreakToBackend],
  );

  const startTimeoutEvent = useCallback(
    (params: {
      side: TeamSide;
      gameTime: string;
      isBetweenPointsTimeout?: boolean;
      startElapsedSeconds?: number;
    }) => {
      if (activeTimeoutEvent) {
        console.log('GameSetup timeout already active, ignoring start', {
          activeTimeoutEventId: activeTimeoutEvent.id,
        });
        return null;
      }
      if (activeHalftimeEvent) {
        console.log('GameSetup cannot start timeout while halftime is active');
        return null;
      }

      const team = params.side === 'home' ? homeTeam : awayTeam;
      const newEvent: GameEvent = {
        id: createId(),
        type: 'timeout',
        teamId: team.id,
        teamName: team.name,
        gameTime: params.gameTime,
        gameClockSeconds: parseClockToSeconds(params.gameTime) ?? undefined,
        startElapsedSeconds: params.startElapsedSeconds,
        isTimeoutActive: true,
        isBetweenPointsTimeout: params.isBetweenPointsTimeout ?? false,
        description: `${team.name} timeout`,
        isSynced: false,
      };

      setLiveEvents((prev) => [newEvent, ...prev]);
      syncBreakToBackend('timeout', true);
      console.log('GameSetup start timeout event', { newEvent });
      return newEvent;
    },
    [activeHalftimeEvent, activeTimeoutEvent, awayTeam, homeTeam, syncBreakToBackend],
  );

  const endTimeoutEvent = useCallback(
    (eventId: string, params: { gameTime: string }) => {
      const endSeconds = parseClockToSeconds(params.gameTime) ?? undefined;
      let updatedEvent: GameEvent | null = null;

      setLiveEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId || event.type !== 'timeout' || !event.isTimeoutActive) {
            return event;
          }
          const startSeconds = event.gameClockSeconds;
          const durationSeconds =
            typeof startSeconds === 'number' && typeof endSeconds === 'number'
              ? Math.max(0, endSeconds - startSeconds)
              : undefined;
          const nextEvent: GameEvent = {
            ...event,
            isTimeoutActive: false,
            timeoutEndTime: params.gameTime,
            timeoutEndSeconds: endSeconds,
            timeoutDurationSeconds: durationSeconds,
            description: `${event.teamName} timeout`,
          };
          updatedEvent = nextEvent;
          return nextEvent;
        }),
      );

      if (updatedEvent) {
        syncBreakToBackend('timeout', false);
      }
      console.log('GameSetup end timeout event', { eventId, gameTime: params.gameTime });
      return updatedEvent;
    },
    [syncBreakToBackend],
  );

  const removeLiveEvent = useCallback((eventId: string) => {
    setLiveEvents((prev) => {
      const remaining = prev.filter((event) => event.id !== eventId);
      const chronological = [...remaining].reverse();
      let home = 0;
      let away = 0;

      const recalculated = chronological.map((event) => {
        if (event.type === 'goal') {
          const isHome = event.teamId === 'home';
          home = isHome ? home + 1 : home;
          away = isHome ? away : away + 1;
          return {
            ...event,
            scoreAtEvent: { home, away },
          };
        }

        return event;
      });

      const nextEvents = recalculated.reverse();
      setHomeScore(home);
      setAwayScore(away);
      console.log('GameSetup remove live event', { eventId, home, away });
      return nextEvents;
    });
  }, []);

  const updateGoalEvent = useCallback(
    (eventId: string, updates: { scorer: Player; assist?: Player | null; gameTime?: string }) => {
      setLiveEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? {
                ...event,
                scorerNumber: updates.scorer.number,
                scorerName: updates.scorer.name,
                assistNumber: updates.assist?.number,
                assistName: updates.assist?.name,
                gameTime: updates.gameTime ?? event.gameTime,
                gameClockSeconds:
                  typeof updates.gameTime === 'string'
                    ? parseClockToSeconds(updates.gameTime) ?? undefined
                    : event.gameClockSeconds,
              }
            : event,
        ),
      );
      console.log('GameSetup update goal event', { eventId, updates });
    },
    [],
  );

  const updateTimeoutEvent = useCallback(
    (eventId: string, side: TeamSide) => {
      const team = side === 'home' ? homeTeam : awayTeam;
      setLiveEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? {
                ...event,
                teamId: team.id,
                teamName: team.name,
                description: `${team.name} timeout`,
              }
            : event,
        ),
      );
      console.log('GameSetup update timeout event', { eventId, side });
    },
    [awayTeam, homeTeam],
  );

  const resetLiveGame = useCallback(() => {
    setHomeScore(0);
    setAwayScore(0);
    setLiveEvents([]);
    setIsGameEnded(false);
    console.log('GameSetup reset live game');
  }, []);

  const resetRoster = useCallback(() => {
    setHomePlayers([]);
    setAwayPlayers([]);
    setHomeTeamName('');
    setAwayTeamName('');
    console.log('GameSetup reset roster info');
  }, []);

  const replaceRosterForSide = useCallback(
    (
      side: TeamSide,
      params: {
        teamName?: string;
        players: Array<{ name: string; number: string }>;
      },
    ) => {
      const nextPlayers: Player[] = params.players.map((p) => ({
        id: createId(),
        name: p.name,
        number: p.number,
        teamId: side,
      }));

      if (side === 'home') {
        setHomePlayers(nextPlayers);
        if (typeof params.teamName === 'string') setHomeTeamName(params.teamName);
      } else {
        setAwayPlayers(nextPlayers);
        if (typeof params.teamName === 'string') setAwayTeamName(params.teamName);
      }

      console.log('GameSetup replace roster', {
        side,
        playerCount: nextPlayers.length,
        teamName: params.teamName,
      });
    },
    [],
  );

  const endGame = useCallback(() => {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const completedGame: Game = {
      id: createId(),
      homeTeam,
      awayTeam,
      score: { home: homeScore, away: awayScore },
      status: 'final',
      period: 2,
      gameTime: 'FINAL',
      date,
      time,
      pointNumber: liveEvents.filter((event) => event.type === 'goal').length,
    };

    const nextGames = [completedGame, ...pastGames];
    const nextEvents = { ...pastGameEvents, [completedGame.id]: [...liveEvents] };

    setPastGames(nextGames);
    setPastGameEvents(nextEvents);
    setIsGameEnded(true);
    void AsyncStorage.setItem(PAST_GAMES_KEY, JSON.stringify(nextGames));
    void AsyncStorage.setItem(PAST_GAME_EVENTS_KEY, JSON.stringify(nextEvents));
    console.log('GameSetup end game', { completedGame, events: liveEvents.length });
    return completedGame;
  }, [awayScore, awayTeam, homeScore, homeTeam, liveEvents, pastGameEvents, pastGames]);

  const signPastGame = useCallback(
    (gameId: string, side: TeamSide, params: { name: string; number: string }) => {
      const name = params.name.trim();
      const number = params.number.trim();
      if (!name || !number) {
        console.log('GameSetup sign past game rejected (missing name or number)', { gameId, side });
        return null;
      }

      const signature: CaptainSignature = { name, number, signedAt: new Date().toISOString() };
      const nextGames = pastGames.map((game) =>
        game.id === gameId
          ? {
              ...game,
              ...(side === 'home'
                ? { homeCaptainSignature: signature }
                : { awayCaptainSignature: signature }),
            }
          : game,
      );

      setPastGames(nextGames);
      void AsyncStorage.setItem(PAST_GAMES_KEY, JSON.stringify(nextGames));
      console.log('GameSetup sign past game', { gameId, side, signature });
      return signature;
    },
    [pastGames],
  );

  const setPastGameAttackStartTeam = useCallback(
    (gameId: string, side: TeamSide) => {
      const nextGames = pastGames.map((game) =>
        game.id === gameId ? { ...game, attackStartTeam: side } : game,
      );

      setPastGames(nextGames);
      void AsyncStorage.setItem(PAST_GAMES_KEY, JSON.stringify(nextGames));
      console.log('GameSetup set past game attack start team', { gameId, side });
    },
    [pastGames],
  );

  const removePastGame = useCallback(
    (gameId: string) => {
      const nextGames = pastGames.filter((game) => game.id !== gameId);
      const nextEvents = { ...pastGameEvents };
      delete nextEvents[gameId];

      setPastGames(nextGames);
      setPastGameEvents(nextEvents);
      void AsyncStorage.setItem(PAST_GAMES_KEY, JSON.stringify(nextGames));
      void AsyncStorage.setItem(PAST_GAME_EVENTS_KEY, JSON.stringify(nextEvents));
      console.log('GameSetup remove past game', { gameId });
    },
    [pastGameEvents, pastGames],
  );

  const clearPastGames = useCallback(() => {
    setPastGames([]);
    setPastGameEvents({});
    void AsyncStorage.removeItem(PAST_GAMES_KEY);
    void AsyncStorage.removeItem(PAST_GAME_EVENTS_KEY);
    console.log('GameSetup clear past games');
  }, []);

  return {
    backendBaseUrl,
    writeToken,
    streamId,
    deviceName,
    homeTeamName,
    awayTeamName,
    homePlayers,
    awayPlayers,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    liveEvents,
    pastGames,
    pastGameEvents,
    setBackendBaseUrl,
    setWriteToken,
    setStreamId,
    setDeviceName,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    updatePlayer,
    removePlayer,
    addGoalEvent,
    startHalftimeEvent,
    endHalftimeEvent,
    activeHalftimeEvent,
    startTimeoutEvent,
    endTimeoutEvent,
    activeTimeoutEvent,
    hasHalftimeEvent,
    isGameEnded,
    setIsGameEnded,
    endGame,
    resetLiveGame,
    updateGoalEvent,
    updateTimeoutEvent,
    removeLiveEvent,
    resetRoster,
    replaceRosterForSide,
    removePastGame,
    clearPastGames,
    signPastGame,
    setPastGameAttackStartTeam,
  };
});

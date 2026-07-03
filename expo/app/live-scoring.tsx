import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { ListChecks, Timer, Flag, Coffee, Plus, Archive, House } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { useGameSetup } from '@/app/game-setup-context';
import { useSettings } from '@/app/settings-context';
import SettingsButton from '@/components/SettingsButton';

const DEFAULT_BACKEND_BASE_URL = 'https://pointtracker-service-ultimate.onrender.com';

export default function LiveScoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    backendBaseUrl,
    writeToken,
    streamId,
    deviceName,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    liveEvents,
    startHalftimeEvent,
    endHalftimeEvent,
    activeHalftimeEvent,
    startTimeoutEvent,
    endTimeoutEvent,
    activeTimeoutEvent,
    hasHalftimeEvent,
    isGameEnded,
    endGame,
  } = useGameSetup();
  const {
    timeBetweenPointsEnabled,
    timeBetweenPointsCallouts,
    timeoutEnabled,
    timeoutCallouts,
    timeoutBetweenPointsEnabled,
    timeoutBetweenPointsCallouts,
    halftimeEnabled,
    halftimeCallouts,
  } = useSettings();
  const period = hasHalftimeEvent ? 2 : 1;
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(true);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockStartRef = useRef<number>(Date.now());
  const [pendingTimeoutStart, setPendingTimeoutStart] = useState<{
    side: 'home' | 'away';
    currentTime: string;
    startElapsedSeconds: number;
  } | null>(null);
  const [dismissedBetweenPointsEventId, setDismissedBetweenPointsEventId] = useState<string | null>(
    null,
  );
  const [autoEndedTimeoutCallout, setAutoEndedTimeoutCallout] = useState<{
    text: string;
    endedAtElapsedSeconds: number;
  } | null>(null);
  const [autoEndedHalftimeCallout, setAutoEndedHalftimeCallout] = useState<{
    text: string;
    endedAtElapsedSeconds: number;
  } | null>(null);

  const isHomeTimeoutActive = activeTimeoutEvent?.teamId === homeTeam.id;
  const isAwayTimeoutActive = activeTimeoutEvent?.teamId === awayTeam.id;
  const isAnyTimeoutActive = !!activeTimeoutEvent;
  const isAnyHalftimeActive = !!activeHalftimeEvent;

  const lastGoalEvent = useMemo(
    () => liveEvents.find((e) => e.type === 'goal') ?? null,
    [liveEvents],
  );

  const completedHalftimeEvent = useMemo(
    () => liveEvents.find((e) => e.type === 'halftime' && e.isHalftimeActive === false) ?? null,
    [liveEvents],
  );

  // Timeouts/halftime carry both a rounded-to-10s `gameClockSeconds` (for the
  // log) and a raw `startElapsedSeconds` (for the running badge). The badge
  // uses the raw value so it starts ticking the instant the button is
  // pressed, rather than waiting for the main clock to catch up to the
  // rounded value.
  const getEventStartSeconds = useCallback((event: { startElapsedSeconds?: number; gameClockSeconds?: number }) => {
    if (typeof event.startElapsedSeconds === 'number') return event.startElapsedSeconds;
    if (typeof event.gameClockSeconds === 'number') return event.gameClockSeconds;
    return null;
  }, []);

  // Same idea, but for the moment a completed halftime *ended* rather than
  // started — that's the reference point "time between points" resumes
  // counting from.
  const getHalftimeEndSeconds = useCallback(
    (event: { halftimeEndElapsedSeconds?: number; halftimeEndSeconds?: number }) => {
      if (typeof event.halftimeEndElapsedSeconds === 'number') return event.halftimeEndElapsedSeconds;
      if (typeof event.halftimeEndSeconds === 'number') return event.halftimeEndSeconds;
      return null;
    },
    [],
  );

  // "Time between points" is keyed off whichever happened more recently: the
  // last goal, or halftime ending. While halftime is running there's no
  // trigger at all, which resets and stops the between-points clock; the
  // instant halftime ends it becomes the new trigger, so the clock restarts
  // from zero automatically without waiting for the next goal.
  const timeBetweenPointsTriggerEvent = useMemo(() => {
    if (activeHalftimeEvent) return null;
    if (!completedHalftimeEvent) return lastGoalEvent;
    if (!lastGoalEvent) return completedHalftimeEvent;

    const goalIndex = liveEvents.indexOf(lastGoalEvent);
    const halftimeIndex = liveEvents.indexOf(completedHalftimeEvent);
    return goalIndex !== -1 && goalIndex < halftimeIndex ? lastGoalEvent : completedHalftimeEvent;
  }, [activeHalftimeEvent, completedHalftimeEvent, lastGoalEvent, liveEvents]);

  const getTimeBetweenPointsStartSeconds = useCallback(
    (event: typeof timeBetweenPointsTriggerEvent) => {
      if (!event) return null;
      if (event.type === 'halftime') return getHalftimeEndSeconds(event);
      return getEventStartSeconds(event);
    },
    [getEventStartSeconds, getHalftimeEndSeconds],
  );

  const timeoutElapsedSeconds = useMemo(() => {
    const startSeconds = activeTimeoutEvent ? getEventStartSeconds(activeTimeoutEvent) : null;
    if (startSeconds === null) return 0;
    return Math.max(0, elapsedSeconds - startSeconds);
  }, [activeTimeoutEvent, elapsedSeconds, getEventStartSeconds]);

  const halftimeElapsedSeconds = useMemo(() => {
    const startSeconds = activeHalftimeEvent ? getEventStartSeconds(activeHalftimeEvent) : null;
    if (startSeconds === null) return 0;
    return Math.max(0, elapsedSeconds - startSeconds);
  }, [activeHalftimeEvent, elapsedSeconds, getEventStartSeconds]);

  // Any timeout started since the last trigger (goal or halftime ending)
  // pauses "time between points": its duration (ongoing if still active,
  // otherwise its recorded end - start) is subtracted from the raw
  // elapsed-since-trigger figure. Because an active timeout's own duration
  // grows in lockstep with `elapsedSeconds`, the net result stays frozen for
  // as long as it runs, then resumes from where it left off once the
  // timeout ends.
  const timeoutSecondsSinceLastGoal = useMemo(() => {
    const triggerSeconds = getTimeBetweenPointsStartSeconds(timeBetweenPointsTriggerEvent);
    if (triggerSeconds === null) {
      return 0;
    }
    return liveEvents.reduce((sum, event) => {
      if (event.type !== 'timeout') return sum;
      const startSeconds = getEventStartSeconds(event);
      if (startSeconds === null || startSeconds < triggerSeconds) return sum;
      if (event.isTimeoutActive) {
        return sum + Math.max(0, elapsedSeconds - startSeconds);
      }
      if (typeof event.timeoutEndSeconds === 'number' && typeof event.gameClockSeconds === 'number') {
        return sum + Math.max(0, event.timeoutEndSeconds - event.gameClockSeconds);
      }
      return sum;
    }, 0);
  }, [liveEvents, timeBetweenPointsTriggerEvent, getTimeBetweenPointsStartSeconds, elapsedSeconds, getEventStartSeconds]);

  const timeSinceLastGoalSeconds = useMemo(() => {
    const triggerSeconds = getTimeBetweenPointsStartSeconds(timeBetweenPointsTriggerEvent);
    if (triggerSeconds === null) {
      return 0;
    }
    const raw = elapsedSeconds - triggerSeconds;
    return Math.max(0, raw - timeoutSecondsSinceLastGoal);
  }, [timeBetweenPointsTriggerEvent, getTimeBetweenPointsStartSeconds, elapsedSeconds, timeoutSecondsSinceLastGoal]);

  // Reappears for every new trigger (even if the previous one was dismissed)
  // since it's keyed off the trigger event's id, and hides once that
  // specific trigger has been dismissed. While halftime is running there is
  // no trigger at all (see `timeBetweenPointsTriggerEvent`), which hides —
  // i.e. resets and stops — this banner; it reappears the instant halftime
  // ends, ticking from zero, without needing a fresh goal.
  const isTimeBetweenPointsVisible =
    !!timeBetweenPointsTriggerEvent &&
    !isGameEnded &&
    timeBetweenPointsTriggerEvent.id !== dismissedBetweenPointsEventId;

  const handleDismissTimeBetweenPoints = useCallback(() => {
    if (!timeBetweenPointsTriggerEvent) return;
    setDismissedBetweenPointsEventId(timeBetweenPointsTriggerEvent.id);
  }, [timeBetweenPointsTriggerEvent]);

  // Callouts only fire while the between-points clock is actually ticking:
  // not dismissed, not game-ended, and not currently paused by a timeout or
  // halftime. Each callout stays up for 15s after its threshold is crossed;
  // when several thresholds are eligible at once the latest one wins.
  const activeTimeBetweenPointsCallout = useMemo(() => {
    if (!timeBetweenPointsEnabled || !isTimeBetweenPointsVisible) return null;
    if (isAnyTimeoutActive || isAnyHalftimeActive) return null;

    return (
      timeBetweenPointsCallouts
        .filter(
          (callout) =>
            callout.enabled &&
            timeSinceLastGoalSeconds >= callout.seconds &&
            timeSinceLastGoalSeconds < callout.seconds + 15,
        )
        .sort((a, b) => b.seconds - a.seconds)[0] ?? null
    );
  }, [
    timeBetweenPointsEnabled,
    timeBetweenPointsCallouts,
    isTimeBetweenPointsVisible,
    isAnyTimeoutActive,
    isAnyHalftimeActive,
    timeSinceLastGoalSeconds,
  ]);

  // Same mechanic as the between-points callouts, but keyed off time since
  // the active timeout started, and each callout only stays up for 5s. A
  // timeout taken between points (before the next point resumed play) uses
  // the "Timeout between points" special-rule schedule instead of the
  // regular one.
  const activeTimeoutCallout = useMemo(() => {
    if (!isAnyTimeoutActive) return null;

    const isBetweenPoints = !!activeTimeoutEvent?.isBetweenPointsTimeout;
    const groupEnabled = isBetweenPoints ? timeoutBetweenPointsEnabled : timeoutEnabled;
    const callouts = isBetweenPoints ? timeoutBetweenPointsCallouts : timeoutCallouts;
    if (!groupEnabled) return null;

    return (
      callouts
        .filter(
          (callout) =>
            callout.enabled &&
            timeoutElapsedSeconds >= callout.seconds &&
            timeoutElapsedSeconds < callout.seconds + 5,
        )
        .sort((a, b) => b.seconds - a.seconds)[0] ?? null
    );
  }, [
    isAnyTimeoutActive,
    activeTimeoutEvent,
    timeoutEnabled,
    timeoutCallouts,
    timeoutBetweenPointsEnabled,
    timeoutBetweenPointsCallouts,
    timeoutElapsedSeconds,
  ]);

  const isAutoEndedTimeoutCalloutVisible =
    !!autoEndedTimeoutCallout && elapsedSeconds - autoEndedTimeoutCallout.endedAtElapsedSeconds < 5;

  // Same mechanic as the timeout callouts: each call stays up for 5s once its
  // threshold is crossed. The highest enabled callout's `seconds` also marks
  // the halftime length, so a separate effect below auto-ends halftime once
  // it's reached.
  const activeHalftimeCallout = useMemo(() => {
    if (!isAnyHalftimeActive || !halftimeEnabled) return null;

    return (
      halftimeCallouts
        .filter(
          (callout) =>
            callout.enabled &&
            halftimeElapsedSeconds >= callout.seconds &&
            halftimeElapsedSeconds < callout.seconds + 5,
        )
        .sort((a, b) => b.seconds - a.seconds)[0] ?? null
    );
  }, [isAnyHalftimeActive, halftimeEnabled, halftimeCallouts, halftimeElapsedSeconds]);

  const isAutoEndedHalftimeCalloutVisible =
    !!autoEndedHalftimeCallout && elapsedSeconds - autoEndedHalftimeCallout.endedAtElapsedSeconds < 5;

  // liveEvents is newest-first. A timeout's index greater than the halftime
  // event's index happened before it (period 1); a smaller index happened
  // after it (period 2). No halftime event yet means everything is period 1.
  // A timeout counts as soon as it exists in liveEvents (i.e. from the
  // moment it starts), regardless of whether it has ended.
  const getTeamTimeoutCounts = useCallback(
    (teamId: string): { half: number; total: number } => {
      const halftimeIndex = liveEvents.findIndex((event) => event.type === 'halftime');
      let half = 0;
      let total = 0;

      liveEvents.forEach((event, index) => {
        if (event.type !== 'timeout' || event.teamId !== teamId) return;
        total += 1;
        const eventPeriod = halftimeIndex === -1 || index > halftimeIndex ? 1 : 2;
        if (eventPeriod === period) half += 1;
      });

      return { half, total };
    },
    [liveEvents, period],
  );

  const homeTimeoutCounts = useMemo(
    () => getTeamTimeoutCounts(homeTeam.id),
    [getTeamTimeoutCounts, homeTeam.id],
  );
  const awayTimeoutCounts = useMemo(
    () => getTeamTimeoutCounts(awayTeam.id),
    [getTeamTimeoutCounts, awayTeam.id],
  );

  const syncClockStopToBackend = useCallback(
    async (finalElapsedSeconds: number) => {
      const token = writeToken.trim();
      const currentStreamId = streamId.trim();
      if (!token || !currentStreamId) return;

      const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(
        /\/+$/,
        '',
      );
      const trimmedDeviceName = deviceName.trim();
      const payload = { gameClockSeconds: Math.max(0, Math.floor(finalElapsedSeconds)), running: false };

      try {
        const res = await fetch(`${normalizedBaseUrl}/streams/${encodeURIComponent(currentStreamId)}/clock`, {
          method: 'PUT',
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
          } catch { /* ignore */ }
          throw new Error(message);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.log('Clock stop sync failed', { message, payload });
      }
    },
    [backendBaseUrl, deviceName, streamId, writeToken],
  );

  const handleEndGamePress = useCallback(() => {
    if (activeTimeoutEvent || activeHalftimeEvent) {
      console.log('End game blocked - timeout or halftime in progress');
      return;
    }
    console.log('End game pressed - showing confirmation');
    Alert.alert(
      'End game?',
      'This will end the game and finalize the score.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('End game confirmation cancelled'),
        },
        {
          text: 'End game',
          style: 'destructive',
          onPress: () => {
            console.log('End game confirmed - moving to history');
            void syncClockStopToBackend(elapsedSeconds);
            endGame();
          },
        },
      ],
    );
  }, [activeHalftimeEvent, activeTimeoutEvent, elapsedSeconds, endGame, syncClockStopToBackend]);

  useEffect(() => {
    console.log('Live scoring clock effect', { isClockRunning, isGameEnded });
    if (isGameEnded) {
      setIsClockRunning(false);
    }
  }, [isGameEnded, isClockRunning]);

  useEffect(() => {
    if (!isClockRunning) {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
        clockIntervalRef.current = null;
      }
      return;
    }

    console.log('Starting game clock interval');
    clockStartRef.current = Date.now() - elapsedSeconds * 1000;
    clockIntervalRef.current = setInterval(() => {
      const nextElapsed = Math.floor((Date.now() - clockStartRef.current) / 1000);
      setElapsedSeconds(nextElapsed);
    }, 1000);

    return () => {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
        clockIntervalRef.current = null;
      }
    };
  }, [elapsedSeconds, isClockRunning]);

  const formattedClock = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = seconds.toString().padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
  }, [elapsedSeconds]);

  const handleHistoryPress = useCallback(() => {
    console.log('Navigating to game history');
    router.push('/game-history' as Href);
  }, [router]);

  const handleHomePress = useCallback(() => {
    console.log('Navigating to home');
    router.replace('/' as Href);
  }, [router]);

  const formatClock = useCallback((totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = seconds.toString().padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
  }, []);

  const getRoundedGameTime = useCallback(() => {
    if (elapsedSeconds <= 0) {
      return '00:00';
    }
    const baseRounded = Math.ceil(elapsedSeconds / 10) * 10;
    const roundedSeconds = elapsedSeconds % 10 === 0 ? elapsedSeconds + 10 : baseRounded;
    const displaySeconds = Number.isFinite(roundedSeconds) ? roundedSeconds : 0;
    const formatted = formatClock(displaySeconds);
    console.log('LiveScoring: rounded game time', {
      elapsedSeconds,
      roundedSeconds: displaySeconds,
      formatted,
    });
    return formatted;
  }, [elapsedSeconds, formatClock]);

  const handleScorePress = useCallback(
    (side: 'home' | 'away') => {
      const roundedTime = getRoundedGameTime();
      router.push({
        pathname: '/goal-details',
        params: { side, time: roundedTime, startElapsedSeconds: String(elapsedSeconds) },
      } as Href);
    },
    [elapsedSeconds, getRoundedGameTime, router],
  );

  const handleHalftimePress = useCallback(() => {
    if (activeHalftimeEvent) {
      const roundedTime = getRoundedGameTime();
      const endedEvent = endHalftimeEvent(activeHalftimeEvent.id, {
        gameTime: roundedTime,
        endElapsedSeconds: elapsedSeconds,
      });
      console.log('LiveScoring halftime ended', endedEvent);
      return;
    }

    const startTime = lastGoalEvent?.gameTime ?? getRoundedGameTime();
    const startElapsedSecondsValue = lastGoalEvent
      ? (getEventStartSeconds(lastGoalEvent) ?? elapsedSeconds)
      : elapsedSeconds;
    const startedEvent = startHalftimeEvent({
      gameTime: startTime,
      startElapsedSeconds: startElapsedSecondsValue,
    });
    if (!startedEvent) {
      Alert.alert('Half-time already logged', 'Only one half-time can be added per game.');
      return;
    }
    console.log('LiveScoring halftime started', startedEvent);
  }, [
    activeHalftimeEvent,
    elapsedSeconds,
    endHalftimeEvent,
    getEventStartSeconds,
    getRoundedGameTime,
    lastGoalEvent,
    startHalftimeEvent,
  ]);

  const handleTimeoutPress = useCallback(
    (side: 'home' | 'away') => {
      const team = side === 'home' ? homeTeam : awayTeam;

      if (activeTimeoutEvent) {
        if (activeTimeoutEvent.teamId !== team.id) return;
        const roundedTime = getRoundedGameTime();
        const endedEvent = endTimeoutEvent(activeTimeoutEvent.id, { gameTime: roundedTime });
        console.log('LiveScoring timeout ended', endedEvent);
        return;
      }

      const roundedTime = getRoundedGameTime();
      setPendingTimeoutStart({ side, currentTime: roundedTime, startElapsedSeconds: elapsedSeconds });
    },
    [activeTimeoutEvent, awayTeam, elapsedSeconds, endTimeoutEvent, getRoundedGameTime, homeTeam],
  );

  const confirmTimeoutStartNow = useCallback(() => {
    if (!pendingTimeoutStart) return;
    const startedEvent = startTimeoutEvent({
      side: pendingTimeoutStart.side,
      gameTime: pendingTimeoutStart.currentTime,
      startElapsedSeconds: pendingTimeoutStart.startElapsedSeconds,
      isBetweenPointsTimeout: isTimeBetweenPointsVisible,
    });
    console.log('LiveScoring timeout started', startedEvent);
    setPendingTimeoutStart(null);
    setAutoEndedTimeoutCallout(null);
  }, [pendingTimeoutStart, startTimeoutEvent, isTimeBetweenPointsVisible]);

  const confirmTimeoutStartAtGoal = useCallback(() => {
    if (!pendingTimeoutStart || !lastGoalEvent) return;
    const startedEvent = startTimeoutEvent({
      side: pendingTimeoutStart.side,
      gameTime: lastGoalEvent.gameTime,
      startElapsedSeconds: getEventStartSeconds(lastGoalEvent) ?? pendingTimeoutStart.startElapsedSeconds,
      isBetweenPointsTimeout: isTimeBetweenPointsVisible,
    });
    console.log('LiveScoring timeout started at goal time', startedEvent);
    setPendingTimeoutStart(null);
    setAutoEndedTimeoutCallout(null);
  }, [pendingTimeoutStart, lastGoalEvent, getEventStartSeconds, startTimeoutEvent, isTimeBetweenPointsVisible]);

  const cancelPendingTimeoutStart = useCallback(() => {
    setPendingTimeoutStart(null);
  }, []);

  // Special rule: a timeout taken between points has no "resume play"
  // button press to end it — it ends itself once its schedule's last
  // enabled call has been made. The triggering call is kept around in its
  // own state so its banner can stay up for 5s independent of the timeout
  // event, which is gone the instant it auto-ends.
  useEffect(() => {
    if (!activeTimeoutEvent?.isBetweenPointsTimeout || !timeoutBetweenPointsEnabled) return;

    const enabledCallouts = timeoutBetweenPointsCallouts.filter((callout) => callout.enabled);
    if (enabledCallouts.length === 0) return;

    const lastCallout = enabledCallouts.reduce((latest, callout) =>
      callout.seconds > latest.seconds ? callout : latest,
    );
    if (timeoutElapsedSeconds < lastCallout.seconds) return;

    const roundedTime = getRoundedGameTime();
    const endedEvent = endTimeoutEvent(activeTimeoutEvent.id, { gameTime: roundedTime });
    setAutoEndedTimeoutCallout({ text: lastCallout.text, endedAtElapsedSeconds: elapsedSeconds });
    console.log('LiveScoring timeout auto-ended (between points)', endedEvent);
  }, [
    activeTimeoutEvent,
    timeoutBetweenPointsEnabled,
    timeoutBetweenPointsCallouts,
    timeoutElapsedSeconds,
    endTimeoutEvent,
    getRoundedGameTime,
    elapsedSeconds,
  ]);

  // Halftime has no "resume play" button press to end it either — it ends
  // itself once its schedule's last enabled call has been made. Same
  // mechanic as the timeout-between-points auto-end above: the triggering
  // call is kept around in its own state so its banner can stay up for 5s
  // independent of the halftime event, which is gone the instant it
  // auto-ends.
  useEffect(() => {
    if (!activeHalftimeEvent || !halftimeEnabled) return;

    const enabledCallouts = halftimeCallouts.filter((callout) => callout.enabled);
    if (enabledCallouts.length === 0) return;

    const lastCallout = enabledCallouts.reduce((latest, callout) =>
      callout.seconds > latest.seconds ? callout : latest,
    );
    if (halftimeElapsedSeconds < lastCallout.seconds) return;

    const roundedTime = getRoundedGameTime();
    const endedEvent = endHalftimeEvent(activeHalftimeEvent.id, {
      gameTime: roundedTime,
      endElapsedSeconds: elapsedSeconds,
    });
    setAutoEndedHalftimeCallout({ text: lastCallout.text, endedAtElapsedSeconds: elapsedSeconds });
    console.log('LiveScoring halftime auto-ended', endedEvent);
  }, [
    activeHalftimeEvent,
    halftimeEnabled,
    halftimeCallouts,
    halftimeElapsedSeconds,
    endHalftimeEvent,
    getRoundedGameTime,
    elapsedSeconds,
  ]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'LIVE SCORING',
          headerTitleStyle: {
            fontWeight: '600' as const,
            color: Colors.textSecondary,
            fontSize: 14,
            // expo-router's Stack.Screen typing sometimes narrows this object;
            // keep the runtime style while satisfying TS.
            letterSpacing: 1.5,
          } as any,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.dark,
          headerLeft: () =>
            isGameEnded ? (
              <TouchableOpacity
                onPress={handleHomePress}
                style={styles.homeButton}
                testID="go-home-button"
              >
                <House size={20} color={Colors.primary} />
              </TouchableOpacity>
            ) : null,
          headerBackVisible: false,
          headerRight: () => <SettingsButton />,
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        testID="live-scoring-scroll"
      >
        {isGameEnded ? (
          <View style={styles.endedBanner} testID="game-ended-banner">
            <Archive size={18} color={Colors.dark} />
            <Text style={styles.endedBannerTitle}>Game ended</Text>
            <Text style={styles.endedBannerText}>
              Live scoring is disabled. Results and logs are now in Game History.
            </Text>
          </View>
        ) : null}
        <View style={styles.timerCard}>
          <Text style={styles.timerText}>{formattedClock}</Text>
          <Text style={styles.periodText}>PERIOD {period}</Text>

          <View style={styles.scoreBoard}>
            <View style={styles.scoreSide}>
              <Text style={styles.scoreLabel}>HOME</Text>
              <Text style={styles.scoreTeam}>{homeTeam.name}</Text>
              <Text style={styles.scoreNumber}>{homeScore}</Text>
            </View>
            <Text style={styles.scoreDivider}>VS</Text>
            <View style={styles.scoreSide}>
              <Text style={styles.scoreLabel}>VISITOR</Text>
              <Text style={styles.scoreTeam}>{awayTeam.name}</Text>
              <Text style={styles.scoreNumber}>{awayScore}</Text>
            </View>
          </View>
        </View>

        {isTimeBetweenPointsVisible ? (
          <>
            <TouchableOpacity
              style={styles.timeBetweenPointsBtn}
              activeOpacity={0.8}
              onPress={handleDismissTimeBetweenPoints}
              testID="time-between-points-button"
            >
              <View style={styles.timeBetweenPointsRow}>
                <Text style={styles.timeBetweenPointsLabel}>Time between points</Text>
                <Text style={styles.timeBetweenPointsValue}>
                  {formatClock(timeSinceLastGoalSeconds)}
                </Text>
              </View>
              <Text style={styles.timeBetweenPointsHint}>Press after the pull</Text>
            </TouchableOpacity>

            {activeTimeBetweenPointsCallout ? (
              <View style={styles.calloutBanner} testID="time-between-points-callout-banner">
                <Text style={styles.calloutBannerText}>
                  {activeTimeBetweenPointsCallout.text}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {activeTimeoutCallout ? (
          <View style={styles.calloutBanner} testID="timeout-callout-banner">
            <Text style={styles.calloutBannerText}>{activeTimeoutCallout.text}</Text>
          </View>
        ) : isAutoEndedTimeoutCalloutVisible && autoEndedTimeoutCallout ? (
          <View style={styles.calloutBanner} testID="timeout-callout-banner">
            <Text style={styles.calloutBannerText}>{autoEndedTimeoutCallout.text}</Text>
          </View>
        ) : null}

        {activeHalftimeCallout ? (
          <View style={styles.calloutBanner} testID="halftime-callout-banner">
            <Text style={styles.calloutBannerText}>{activeHalftimeCallout.text}</Text>
          </View>
        ) : isAutoEndedHalftimeCalloutVisible && autoEndedHalftimeCallout ? (
          <View style={styles.calloutBanner} testID="halftime-callout-banner">
            <Text style={styles.calloutBannerText}>{autoEndedHalftimeCallout.text}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.homeScoreBtn,
            isGameEnded || isAnyTimeoutActive || isAnyHalftimeActive ? styles.disabledCard : null,
          ]}
          activeOpacity={0.85}
          onPress={() => handleScorePress('home')}
          disabled={isGameEnded || isAnyTimeoutActive || isAnyHalftimeActive}
          testID="home-score-button"
        >
          <View>
            <Text style={styles.scoreBtnLabel}>HOME</Text>
            <Text style={styles.scoreBtnTeam}>{homeTeam.name}</Text>
            <Text style={styles.scoreBtnAction}>Score +1</Text>
          </View>
          <View style={styles.scoreBtnPlus}>
            <Plus size={22} color={Colors.white} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.awayScoreBtn,
            isGameEnded || isAnyTimeoutActive || isAnyHalftimeActive ? styles.disabledCard : null,
          ]}
          activeOpacity={0.85}
          onPress={() => handleScorePress('away')}
          disabled={isGameEnded || isAnyTimeoutActive || isAnyHalftimeActive}
          testID="away-score-button"
        >
          <View>
            <Text style={styles.scoreBtnLabelDark}>VISITOR</Text>
            <Text style={styles.scoreBtnTeamDark}>{awayTeam.name}</Text>
            <Text style={styles.scoreBtnActionDark}>Score +1</Text>
          </View>
          <View style={styles.scoreBtnPlusDark}>
            <Plus size={22} color={Colors.white} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewLogBtn}
          activeOpacity={0.85}
          onPress={isGameEnded ? handleHistoryPress : () => router.push('/game-log' as Href)}
          testID="view-game-log-button"
        >
          {isGameEnded ? (
            <Archive size={20} color={Colors.white} />
          ) : (
            <ListChecks size={20} color={Colors.white} />
          )}
          <Text style={styles.viewLogText}>
            {isGameEnded ? 'VIEW GAME HISTORY' : 'VIEW GAME LOG'}
          </Text>
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[
              styles.quickActionBtn,
              isHomeTimeoutActive ? styles.quickActionBtnActive : null,
              isGameEnded || (isAnyTimeoutActive && !isHomeTimeoutActive) || isAnyHalftimeActive
                ? styles.disabledAction
                : null,
            ]}
            testID="home-timeout-button"
            onPress={() => handleTimeoutPress('home')}
            disabled={
              isGameEnded || (isAnyTimeoutActive && !isHomeTimeoutActive) || isAnyHalftimeActive
            }
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: isHomeTimeoutActive ? Colors.white : Colors.warningLight },
              ]}
            >
              <Timer size={20} color={Colors.warning} />
            </View>
            <Text
              style={[
                styles.quickActionLabel,
                isHomeTimeoutActive ? styles.quickActionLabelActive : null,
              ]}
            >
              {homeTeam.name.toUpperCase()}{'\n'}TIMEOUT
            </Text>
            <Text
              style={[
                styles.quickActionSubLabel,
                isHomeTimeoutActive ? styles.quickActionSubLabelActive : null,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              testID="home-timeout-count"
            >
              {`${homeTimeoutCounts.half} / Half ${period} - total ${homeTimeoutCounts.total}`}
            </Text>
            {isHomeTimeoutActive ? (
              <Text style={styles.timeoutRunningClock} testID="home-timeout-clock">
                {formatClock(timeoutElapsedSeconds)}
              </Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionBtn,
              isAwayTimeoutActive ? styles.quickActionBtnActive : null,
              isGameEnded || (isAnyTimeoutActive && !isAwayTimeoutActive) || isAnyHalftimeActive
                ? styles.disabledAction
                : null,
            ]}
            testID="away-timeout-button"
            onPress={() => handleTimeoutPress('away')}
            disabled={
              isGameEnded || (isAnyTimeoutActive && !isAwayTimeoutActive) || isAnyHalftimeActive
            }
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: isAwayTimeoutActive ? Colors.white : Colors.warningLight },
              ]}
            >
              <Timer size={20} color={Colors.warning} />
            </View>
            <Text
              style={[
                styles.quickActionLabel,
                isAwayTimeoutActive ? styles.quickActionLabelActive : null,
              ]}
            >
              {awayTeam.name.toUpperCase()}{'\n'}TIMEOUT
            </Text>
            <Text
              style={[
                styles.quickActionSubLabel,
                isAwayTimeoutActive ? styles.quickActionSubLabelActive : null,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              testID="away-timeout-count"
            >
              {`${awayTimeoutCounts.half} / Half ${period} - total ${awayTimeoutCounts.total}`}
            </Text>
            {isAwayTimeoutActive ? (
              <Text style={styles.timeoutRunningClock} testID="away-timeout-clock">
                {formatClock(timeoutElapsedSeconds)}
              </Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionBtn,
              isAnyHalftimeActive ? styles.quickActionBtnActive : null,
              isGameEnded ||
              (hasHalftimeEvent && !isAnyHalftimeActive) ||
              isAnyTimeoutActive
                ? styles.disabledAction
                : null,
            ]}
            testID="half-button"
            onPress={handleHalftimePress}
            disabled={
              isGameEnded || (hasHalftimeEvent && !isAnyHalftimeActive) || isAnyTimeoutActive
            }
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: isAnyHalftimeActive ? Colors.white : Colors.gray100 },
              ]}
            >
              <Coffee size={20} color={isAnyHalftimeActive ? Colors.warning : Colors.textSecondary} />
            </View>
            <Text
              style={[
                styles.quickActionLabel,
                isAnyHalftimeActive ? styles.quickActionLabelActive : null,
              ]}
            >
              {hasHalftimeEvent && !isAnyHalftimeActive ? 'HALF LOGGED' : 'HALF'}
            </Text>
            {isAnyHalftimeActive ? (
              <Text style={styles.timeoutRunningClock} testID="halftime-clock">
                {formatClock(halftimeElapsedSeconds)}
              </Text>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionBtn,
              isGameEnded || isAnyTimeoutActive || isAnyHalftimeActive
                ? styles.disabledAction
                : null,
            ]}
            testID="end-game-button"
            onPress={handleEndGamePress}
            disabled={isGameEnded || isAnyTimeoutActive || isAnyHalftimeActive}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dangerLight }]}>
              <Flag size={20} color={Colors.danger} />
            </View>
            <Text style={[styles.quickActionLabel, { color: Colors.danger }]}>END{'\n'}GAME</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={!!pendingTimeoutStart}
        transparent
        animationType="fade"
        onRequestClose={cancelPendingTimeoutStart}
      >
        <Pressable style={styles.timeoutModalOverlay} onPress={cancelPendingTimeoutStart}>
          <Pressable style={styles.timeoutModalCard} onPress={() => {}}>
            <Text style={styles.timeoutModalTitle}>
              {pendingTimeoutStart?.side === 'home' ? homeTeam.name : awayTeam.name} Timeout
            </Text>
            <Text style={styles.timeoutModalSubtitle}>When did the timeout start?</Text>

            <TouchableOpacity style={styles.timeoutOptionBtn} onPress={confirmTimeoutStartNow}>
              <Text style={styles.timeoutOptionLabel}>Right now</Text>
              <Text style={styles.timeoutOptionTime}>{pendingTimeoutStart?.currentTime}</Text>
            </TouchableOpacity>

            {lastGoalEvent && (
              <TouchableOpacity
                style={[styles.timeoutOptionBtn, styles.timeoutOptionGoalBtn]}
                onPress={confirmTimeoutStartAtGoal}
              >
                <Text style={[styles.timeoutOptionLabel, styles.timeoutOptionGoalLabel]}>
                  Same time as last goal
                </Text>
                <Text style={[styles.timeoutOptionTime, styles.timeoutOptionGoalTime]}>
                  {lastGoalEvent.gameTime}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.timeoutCancelBtn} onPress={cancelPendingTimeoutStart}>
              <Text style={styles.timeoutCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  timerCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  timerText: {
    fontSize: 44,
    fontWeight: '800' as const,
    color: Colors.dark,
    letterSpacing: -2,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 12,
  },
  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  scoreSide: {
    flex: 1,
    backgroundColor: Colors.gray100,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  scoreTeam: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.dark,
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
  },
  scoreNumber: {
    fontSize: 38,
    fontWeight: '800' as const,
    color: Colors.dark,
    letterSpacing: -2,
  },
  scoreDivider: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    marginHorizontal: 12,
  },
  timeBetweenPointsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: Colors.primaryFaded,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  timeBetweenPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBetweenPointsLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primaryDark,
    letterSpacing: 0.3,
  },
  timeBetweenPointsValue: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.primaryDark,
  },
  timeBetweenPointsHint: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  calloutBanner: {
    backgroundColor: Colors.warning,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  calloutBannerText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  homeScoreBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  scoreBtnLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
  },
  scoreBtnTeam: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 2,
  },
  scoreBtnAction: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 4,
  },
  scoreBtnPlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  awayScoreBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.darkSecondary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  scoreBtnLabelDark: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
  },
  scoreBtnTeamDark: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 2,
  },
  scoreBtnActionDark: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 4,
  },
  scoreBtnPlusDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.dark,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  viewLogText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 14,
  },
  quickActionSubLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 3,
  },
  quickActionSubLabelActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  quickActionBtnActive: {
    backgroundColor: Colors.warning,
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  quickActionLabelActive: {
    color: Colors.white,
  },
  timeoutRunningClock: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  disabledCard: {
    opacity: 0.45,
  },
  disabledAction: {
    opacity: 0.5,
  },
  endedBanner: {
    backgroundColor: Colors.gray100,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 6,
  },
  endedBannerTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.dark,
  },
  endedBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  homeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 0,
  },
  timeoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timeoutModalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
  },
  timeoutModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 6,
  },
  timeoutModalSubtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 18,
  },
  timeoutOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  timeoutOptionLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  timeoutOptionTime: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  timeoutOptionGoalBtn: {
    backgroundColor: Colors.warningLight,
  },
  timeoutOptionGoalLabel: {
    color: Colors.warning,
  },
  timeoutOptionGoalTime: {
    color: Colors.warning,
  },
  timeoutCancelBtn: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  timeoutCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});

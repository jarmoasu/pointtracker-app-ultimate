import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { ListChecks, Timer, Flag, Coffee, Plus, Archive, House } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { useGameSetup } from '@/app/game-setup-context';

export default function LiveScoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    addHalftimeEvent,
    addTimeoutEvent,
    hasHalftimeEvent,
    isGameEnded,
    endGame,
  } = useGameSetup();
  const period = hasHalftimeEvent ? 2 : 1;
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(true);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockStartRef = useRef<number>(Date.now());

  const handleEndGamePress = useCallback(() => {
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
            endGame();
          },
        },
      ],
    );
  }, [endGame]);

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
      router.push({ pathname: '/goal-details', params: { side, time: roundedTime } } as Href);
    },
    [getRoundedGameTime, router],
  );

  const handleHalftimePress = useCallback(() => {
    const roundedTime = getRoundedGameTime();
    const halftimeEvent = addHalftimeEvent({ gameTime: roundedTime });
    if (!halftimeEvent) {
      Alert.alert('Half-time already logged', 'Only one half-time can be added per game.');
      return;
    }
    console.log('LiveScoring halftime logged', halftimeEvent);
  }, [addHalftimeEvent, getRoundedGameTime]);

  const handleTimeoutPress = useCallback(
    (side: 'home' | 'away') => {
      const roundedTime = getRoundedGameTime();
      const timeoutEvent = addTimeoutEvent({ side, gameTime: roundedTime });
      console.log('LiveScoring timeout logged', timeoutEvent);
    },
    [addTimeoutEvent, getRoundedGameTime],
  );

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
          headerRight: () => null,
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

        <TouchableOpacity
          style={[styles.homeScoreBtn, isGameEnded ? styles.disabledCard : null]}
          activeOpacity={0.85}
          onPress={() => handleScorePress('home')}
          disabled={isGameEnded}
          testID="home-score-button"
        >
          <View>
            <Text style={styles.scoreBtnLabel}>HOME</Text>
            <Text style={styles.scoreBtnTeam}>{homeTeam.name}</Text>
            <Text style={styles.scoreBtnAction}>Score +1</Text>
          </View>
          <View style={styles.scoreBtnPlus}>
            <Plus size={28} color={Colors.white} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.awayScoreBtn, isGameEnded ? styles.disabledCard : null]}
          activeOpacity={0.85}
          onPress={() => handleScorePress('away')}
          disabled={isGameEnded}
          testID="away-score-button"
        >
          <View>
            <Text style={styles.scoreBtnLabelDark}>VISITOR</Text>
            <Text style={styles.scoreBtnTeamDark}>{awayTeam.name}</Text>
            <Text style={styles.scoreBtnActionDark}>Score +1</Text>
          </View>
          <View style={styles.scoreBtnPlusDark}>
            <Plus size={28} color={Colors.white} />
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
            style={[styles.quickActionBtn, isGameEnded ? styles.disabledAction : null]}
            testID="home-timeout-button"
            onPress={() => handleTimeoutPress('home')}
            disabled={isGameEnded}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.warningLight }]}>
              <Timer size={20} color={Colors.warning} />
            </View>
            <Text style={styles.quickActionLabel}>{homeTeam.name.toUpperCase()}{'\n'}TIMEOUT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, isGameEnded ? styles.disabledAction : null]}
            testID="away-timeout-button"
            onPress={() => handleTimeoutPress('away')}
            disabled={isGameEnded}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.warningLight }]}>
              <Timer size={20} color={Colors.warning} />
            </View>
            <Text style={styles.quickActionLabel}>{awayTeam.name.toUpperCase()}{'\n'}TIMEOUT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, isGameEnded ? styles.disabledAction : null]}
            testID="half-button"
            onPress={handleHalftimePress}
            disabled={isGameEnded || hasHalftimeEvent}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.gray100 }]}>
              <Coffee size={20} color={Colors.textSecondary} />
            </View>
            <Text style={styles.quickActionLabel}>{hasHalftimeEvent ? 'HALF LOGGED' : 'HALF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, isGameEnded ? styles.disabledAction : null]}
            testID="end-game-button"
            onPress={handleEndGamePress}
            disabled={isGameEnded}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.dangerLight }]}>
              <Flag size={20} color={Colors.danger} />
            </View>
            <Text style={[styles.quickActionLabel, { color: Colors.danger }]}>END{'\n'}GAME</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  homeScoreBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 22,
    marginBottom: 12,
  },
  scoreBtnLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
  },
  scoreBtnTeam: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 2,
  },
  scoreBtnAction: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 4,
  },
  scoreBtnPlus: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    padding: 22,
    marginBottom: 12,
  },
  scoreBtnLabelDark: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
  },
  scoreBtnTeamDark: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 2,
  },
  scoreBtnActionDark: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.white,
    marginTop: 4,
  },
  scoreBtnPlusDark: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    paddingVertical: 14,
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
});

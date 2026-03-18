import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, Play, Coffee } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { mockGameEvents } from '@/mocks/games';
import { GameEvent } from '@/types/game';
import { useGameSetup } from '@/app/game-setup-context';

function ScoreHeader({
  game,
}: {
  game: {
    score: { home: number; away: number };
    homeTeam: { abbreviation: string };
    awayTeam: { abbreviation: string };
    date: string;
  } | null;
}) {

  return (
    <View style={styles.scoreHeader} testID="past-game-score-header">
      <View style={styles.scoreCol}>
        <Text style={styles.scoreNum}>{game?.score.home ?? 0}</Text>
        <Text style={styles.scoreTeamLabel}>{game?.homeTeam.abbreviation ?? 'HOME'}</Text>
      </View>
      <View style={styles.scoreTimeCol}>
        <Text style={styles.scoreTimeText}>FINAL</Text>
        <Text style={styles.scorePeriod}>{game?.date ?? '--'}</Text>
      </View>
      <View style={styles.scoreCol}>
        <Text style={styles.scoreNum}>{game?.score.away ?? 0}</Text>
        <Text style={styles.scoreTeamLabel}>{game?.awayTeam.abbreviation ?? 'AWAY'}</Text>
      </View>
    </View>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function GoalEventCard({ event }: { event: GameEvent }) {
  const isHome = event.teamId === 'home';

  return (
    <View style={styles.eventCard} testID="past-goal-event-card">
      <View style={styles.eventCardHeader}>
        <View
          style={[
            styles.eventTeamBadge,
            { backgroundColor: isHome ? Colors.primaryFaded : Colors.gray100 },
          ]}
        >
          <Text
            style={[
              styles.eventTeamBadgeText,
              { color: isHome ? Colors.primary : Colors.textSecondary },
            ]}
          >
            {event.teamName} GOAL
          </Text>
        </View>
        <Text style={styles.eventTime}>{event.gameTime}</Text>
      </View>

      <View style={styles.eventDetails}>
        <View style={styles.eventPlayerRow}>
          <Text style={styles.eventPlayerLabel}>GOAL</Text>
          <View
            style={[
              styles.eventPlayerNumber,
              { backgroundColor: isHome ? Colors.primary : Colors.dark },
            ]}
          >
            <Text style={styles.eventPlayerNumText}>{event.scorerNumber}</Text>
          </View>
          <Text style={styles.eventPlayerName} numberOfLines={1}>
            {event.scorerName}
          </Text>
        </View>

        <View style={styles.eventPlayerRow}>
          <Text style={styles.eventPlayerLabel}>ASSIST</Text>
          {event.assistNumber || event.assistName ? (
            <>
              <View
                style={[
                  styles.eventPlayerNumber,
                  { backgroundColor: isHome ? Colors.accent : Colors.darkSecondary },
                ]}
              >
                <Text style={styles.eventPlayerNumText}>{event.assistNumber}</Text>
              </View>
              <Text style={styles.eventPlayerName} numberOfLines={1}>
                {event.assistName}
              </Text>
            </>
          ) : (
            <>
              <View
                style={styles.eventPlayerNumberPlaceholder}
                pointerEvents="none"
                accessible={false}
              />
              <Text style={styles.callahanText}>CALLAHAN</Text>
            </>
          )}
        </View>
      </View>

      {event.scoreAtEvent && (
        <Text style={styles.eventScore}>
          Score: {event.scoreAtEvent.home} - {event.scoreAtEvent.away}
        </Text>
      )}
    </View>
  );
}

function TimeoutEvent({ event }: { event: GameEvent }) {
  return (
    <View style={styles.timeoutCard} testID="past-timeout-event-card">
      <View style={styles.timeoutLeft}>
        <Clock size={18} color={Colors.textTertiary} />
        <View>
          <Text style={styles.timeoutTitle}>Timeout</Text>
          <Text style={styles.timeoutDesc}>{event.description}</Text>
        </View>
      </View>
      <View style={styles.timeoutRight}>
        <Text style={styles.eventTime}>{event.gameTime}</Text>
      </View>
    </View>
  );
}

function HalftimeEvent({ event }: { event: GameEvent }) {
  return (
    <View style={styles.halftimeCard} testID="past-halftime-event-card">
      <View style={styles.timeoutLeft}>
        <Coffee size={18} color={Colors.textTertiary} />
        <View>
          <Text style={styles.timeoutTitle}>Half-time</Text>
          <Text style={styles.timeoutDesc}>Break</Text>
        </View>
      </View>
      <View style={styles.timeoutRight}>
        <Text style={styles.eventTime}>{event.gameTime}</Text>
      </View>
    </View>
  );
}

function GameStartEvent({ event }: { event: GameEvent }) {
  return (
    <View style={styles.halftimeDivider}>
      <View style={styles.dividerLine} />
      <View style={styles.gameStartBadge}>
        <Play size={14} color={Colors.primary} fill={Colors.primary} />
        <Text style={styles.gameStartText}>GAME START</Text>
        <Text style={styles.halftimeTime}>{event.gameTime}</Text>
      </View>
      <View style={styles.dividerLine} />
    </View>
  );
}

export default function PastGameLogScreen() {
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const selectedGameId = gameId ?? null;
  const { pastGames, pastGameEvents } = useGameSetup();

  const game = useMemo(
    () => pastGames.find((item) => item.id === selectedGameId) ?? null,
    [pastGames, selectedGameId],
  );
  const events = selectedGameId ? pastGameEvents[selectedGameId] ?? [] : [];
  const logEvents = events.length > 0 ? events : mockGameEvents;
  const justNowEvents = logEvents.slice(0, 2);
  const earlierEvents = logEvents.slice(2);
  const hasGame = Boolean(game);
  const hasEvents = logEvents.length > 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Past Game Log',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.dark,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                console.log('PastGameLog: returning to history');
                router.back();
              }}
              style={styles.headerButton}
              testID="past-game-log-back-button"
            >
              <Text style={styles.headerButtonText}>Done</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasGame ? (
          <>
            <ScoreHeader game={game} />

            {hasEvents ? (
              <>
                <SectionDivider label="JUST NOW" />

                {justNowEvents.map((event) => {
                  if (event.type === 'goal') return <GoalEventCard key={event.id} event={event} />;
                  if (event.type === 'timeout') return <TimeoutEvent key={event.id} event={event} />;
                  if (event.type === 'halftime') return <HalftimeEvent key={event.id} event={event} />;
                  if (event.type === 'game_start') return <GameStartEvent key={event.id} event={event} />;
                  return null;
                })}

                {earlierEvents.map((event) => {
                  if (event.type === 'goal') return <GoalEventCard key={event.id} event={event} />;
                  if (event.type === 'timeout') return <TimeoutEvent key={event.id} event={event} />;
                  if (event.type === 'halftime') return <HalftimeEvent key={event.id} event={event} />;
                  if (event.type === 'game_start') return <GameStartEvent key={event.id} event={event} />;
                  return null;
                })}
              </>
            ) : (
              <View style={styles.emptyState} testID="past-log-empty">
                <Text style={styles.emptyTitle}>No events recorded</Text>
                <Text style={styles.emptyText}>This game has no log entries yet.</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState} testID="past-game-empty">
            <Text style={styles.emptyTitle}>No past games</Text>
            <Text style={styles.emptyText}>Once a game ends, its log appears here.</Text>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
  },
  scoreCol: {
    alignItems: 'center',
    flex: 1,
  },
  scoreNum: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.dark,
  },
  scoreTeamLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  scoreTimeCol: {
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scoreTimeText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark,
  },
  scorePeriod: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTeamBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventTeamBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  eventDetails: {
    flexDirection: 'column',
    gap: 8,
  },
  eventPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventPlayerLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 4,
    width: 56,
    textAlign: 'right',
  },
  eventPlayerNumber: {
    width: 46,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  eventPlayerNumberPlaceholder: {
    width: 46,
    height: 34,
    borderRadius: 8,
    opacity: 0,
  },
  eventPlayerNumText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  eventPlayerName: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  callahanText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  eventScore: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.dark,
    marginTop: 8,
  },
  timeoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gray200,
  },
  timeoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeoutTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark,
  },
  timeoutDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timeoutRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  halftimeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gray200,
  },
  gameStartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  gameStartText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});

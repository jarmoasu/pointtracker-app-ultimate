import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Trash2, Calendar, Clock, House } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { mockGameEvents } from '@/mocks/games';
import { GameEvent } from '@/types/game';
import { useGameSetup } from '@/app/game-setup-context';

interface HistoryGroup {
  label: string;
  count: number;
  games: ReturnType<typeof useGameSetup>['pastGames'];
}

function GameHistoryCard({
  game,
  onOpenLog,
  logEvents,
  onDeleteGame,
}: {
  game: ReturnType<typeof useGameSetup>['pastGames'][0];
  onOpenLog: (gameId: string) => void;
  logEvents: GameEvent[];
  onDeleteGame: (gameId: string) => void;
}) {

  return (
    <View style={styles.card} testID="history-game-card">
      <View style={styles.cardHeader}>
        <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDeleteGame(game.id)}
          testID={`delete-game-button-${game.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Delete game ${game.homeTeam.abbreviation} vs ${game.awayTeam.abbreviation}`}
        >
          <Trash2 size={18} color={Colors.danger} />
        </TouchableOpacity>
      </View>
      <Text style={styles.scoreText}>
        {game.score.home} — {game.score.away}
      </Text>
      <Text style={styles.teamsText}>
        <Text style={styles.teamNameBold}>{game.homeTeam.name}</Text>
        <Text style={styles.vsText}>  vs  </Text>
        <Text style={styles.teamNameBold}>{game.awayTeam.name}</Text>
      </Text>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Calendar size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{game.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{game.time}</Text>
        </View>
      </View>
      <View style={styles.logSection} testID="history-game-log">
        <Text style={styles.logTitle}>Game Log</Text>
        {logEvents.length > 0 ? (
          logEvents.map((event) => (
            <View key={event.id} style={styles.logRow}>
              <Text style={styles.logTime}>{event.gameTime}</Text>
              <Text style={styles.logText}>
                {(event.teamName ?? 'Game').toUpperCase()} · {event.type.replace('_', ' ')}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.logEmptyText}>No events logged yet.</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.viewLogButton}
        onPress={() => {
          console.log('GameHistory: open past game log', game.id);
          onOpenLog(game.id);
        }}
        testID="history-view-log-button"
      >
        <Text style={styles.viewLogButtonText}>View full game log</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function GameHistoryScreen() {
  const router = useRouter();
  const { pastGames, pastGameEvents, removePastGame, clearPastGames } = useGameSetup();

  const historyGroups: HistoryGroup[] = pastGames.length
    ? [
        {
          label: 'PAST GAMES',
          count: pastGames.length,
          games: pastGames,
        },
      ]
    : [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Game History',
          headerLeft: () => (
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => {
                console.log('GameHistory: navigating to home');
                router.replace('/');
              }}
              testID="game-history-home-button"
            >
              <House size={20} color={Colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            pastGames.length ? (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Clear history?',
                    'This will permanently delete all games from your local history.',
                    [
                      {
                        text: 'Clear all',
                        style: 'destructive',
                        onPress: () => clearPastGames(),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ],
                  );
                }}
                style={styles.clearAllButton}
                testID="clear-history-button"
                accessibilityRole="button"
                accessibilityLabel="Clear game history"
              >
                <Text style={styles.clearAllButtonText}>Clear</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {historyGroups.map((group) => (
          <View key={group.label}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <Text style={styles.groupCount}>
                {group.count} {group.count === 1 ? 'GAME' : 'GAMES'}
              </Text>
            </View>
            {group.games.map((game) => (
              <GameHistoryCard
                key={game.id}
                game={game}
                logEvents={(pastGameEvents[game.id] ?? mockGameEvents).slice(0, 3)}
                onOpenLog={(gameId) => {
                  router.push({ pathname: '/past-game-log', params: { gameId } } as Href);
                }}
                onDeleteGame={(gameId) => {
                  const target = pastGames.find((g) => g.id === gameId);
                  const title = target
                    ? `Delete ${target.homeTeam.abbreviation} vs ${target.awayTeam.abbreviation}?`
                    : 'Delete this game?';
                  Alert.alert(title, 'This will remove the game and its log from your history.', [
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => removePastGame(gameId),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              />
            ))}
          </View>
        ))}
        {historyGroups.length === 0 && (
          <View style={styles.emptyState} testID="history-empty-state">
            <Text style={styles.emptyTitle}>No games recorded yet</Text>
            <Text style={styles.emptyText}>Your finished games will appear here.</Text>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  finalScoreLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.dark,
    letterSpacing: -1,
    marginBottom: 6,
  },
  teamsText: {
    fontSize: 15,
    marginBottom: 12,
  },
  teamNameBold: {
    fontWeight: '700' as const,
    color: Colors.dark,
  },
  vsText: {
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    fontSize: 13,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 18,
  },
  logSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  logTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  viewLogButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewLogButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  logTime: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.dark,
    width: 52,
  },
  logText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  logEmptyText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  homeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  clearAllButton: {
    marginRight: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.dangerLight,
  },
  clearAllButtonText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.danger,
    letterSpacing: 0.4,
  },
});

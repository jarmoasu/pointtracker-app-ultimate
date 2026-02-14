import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { Trash2, Calendar, Clock } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { mockGames } from '@/mocks/games';

interface HistoryGroup {
  label: string;
  count: number;
  games: typeof mockGames;
}

const historyGroups: HistoryGroup[] = [
  {
    label: 'AUGUST 2023',
    count: 3,
    games: mockGames.filter((g) => g.date.includes('Aug')),
  },
  {
    label: 'JULY 2023',
    count: 1,
    games: mockGames.filter((g) => g.date.includes('Jul')),
  },
];

function GameHistoryCard({ game }: { game: typeof mockGames[0] }) {
  return (
    <View style={styles.card} testID="history-game-card">
      <View style={styles.cardHeader}>
        <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
        <TouchableOpacity style={styles.deleteBtn} testID="delete-game-button">
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
    </View>
  );
}

export default function GameHistoryScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Game History',
          headerRight: () => (
            <TouchableOpacity testID="export-button">
              <Text style={styles.exportText}>Export</Text>
            </TouchableOpacity>
          ),
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
              <GameHistoryCard key={game.id} game={game} />
            ))}
          </View>
        ))}
        {historyGroups.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No games recorded yet</Text>
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
  exportText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
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
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});

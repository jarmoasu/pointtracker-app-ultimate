import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Colors from '@/constants/colors';
import type { GameEvent, Team } from '@/types/game';
import { computePlayerStats } from '@/utils/playerStats';

function TeamStatsCard({ team, events }: { team: Team; events: GameEvent[] }) {
  const stats = React.useMemo(
    () => computePlayerStats(team.players, events),
    [team.players, events],
  );

  return (
    <View style={styles.teamCard} testID={`team-stats-${team.id}`}>
      <Text style={styles.teamName}>{team.name}</Text>

      {stats.length > 0 ? (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.playerCol]}>PLAYER</Text>
            <Text style={styles.headerCell}>G</Text>
            <Text style={styles.headerCell}>A</Text>
            <Text style={styles.headerCell}>PTS</Text>
          </View>
          {stats.map((line) => (
            <View
              key={line.player.id}
              style={styles.statsRow}
              testID={`player-stat-row-${line.player.id}`}
            >
              <View style={styles.playerCol}>
                <Text style={styles.playerNumber}>#{line.player.number || '-'}</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {line.player.name || 'Unnamed'}
                </Text>
              </View>
              <Text style={styles.statsCell}>{line.goals}</Text>
              <Text style={styles.statsCell}>{line.assists}</Text>
              <Text style={[styles.statsCell, styles.pointsCell]}>{line.points}</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.emptyText}>No players on this roster yet.</Text>
      )}
    </View>
  );
}

export default function GameStatistics({
  homeTeam,
  awayTeam,
  events,
}: {
  homeTeam: Team;
  awayTeam: Team;
  events: GameEvent[];
}) {
  return (
    <View testID="game-statistics">
      <TeamStatsCard team={homeTeam} events={events} />
      <TeamStatsCard team={awayTeam} events={events} />
    </View>
  );
}

const styles = StyleSheet.create({
  teamCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerCell: {
    width: 40,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  playerCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  playerNumber: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    minWidth: 28,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark,
    flexShrink: 1,
  },
  statsCell: {
    width: 40,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  pointsCell: {
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
});

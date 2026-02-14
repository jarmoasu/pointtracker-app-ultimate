import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, PlusCircle, Disc } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { mockGames } from '@/mocks/games';
import { Game } from '@/types/game';

function LiveBadge() {
  return (
    <View style={styles.liveBadge}>
      <View style={styles.liveDot} />
      <Text style={styles.liveBadgeText}>LIVE</Text>
    </View>
  );
}

function FinalBadge() {
  return (
    <View style={styles.finalBadge}>
      <Text style={styles.finalBadgeText}>FINAL</Text>
    </View>
  );
}

function TeamAvatar({ name, color }: { name: string; color: string }) {
  return (
    <View style={[styles.teamAvatar, { backgroundColor: color }]}>
      <Text style={styles.teamAvatarText}>{name.charAt(0)}</Text>
    </View>
  );
}

function LiveGameCard({ game }: { game: Game }) {
  return (
    <View
      style={styles.liveGameCard}
      testID="live-game-card"
    >
      <View style={styles.liveCardHeader}>
        <LiveBadge />
        <Text style={styles.matchOngoing}>MATCH ONGOING</Text>
      </View>
      <View style={styles.liveScoreRow}>
        <View style={styles.liveTeamCol}>
          <TeamAvatar name={game.homeTeam.name} color={game.homeTeam.color} />
          <Text style={styles.liveTeamName}>{game.homeTeam.name}</Text>
        </View>
        <View style={styles.liveScoreCenter}>
          <Text style={styles.liveScore}>
            {game.score.home} - {game.score.away}
          </Text>
          <Text style={styles.livePointInfo}>
            POINT {game.pointNumber} · {game.period}H
          </Text>
        </View>
        <View style={styles.liveTeamCol}>
          <TeamAvatar name={game.awayTeam.name} color={game.awayTeam.color} />
          <Text style={styles.liveTeamName}>{game.awayTeam.name}</Text>
        </View>
      </View>
    </View>
  );
}

function FinalGameCard({
  game,
  onOpenHistory,
}: {
  game: Game;
  onOpenHistory: (gameId: string) => void;
}) {
  return (
    <View
      style={styles.finalGameCard}
      testID="final-game-card"
    >
      <View style={styles.finalCardHeader}>
        <FinalBadge />
        <Text style={styles.finalDate}>
          {game.date} · {game.time}
        </Text>
      </View>
      <View style={styles.finalScoreRow}>
        <Text style={[
          styles.finalTeamName,
          game.score.home > game.score.away && styles.winnerText,
        ]}>
          {game.homeTeam.name}
        </Text>
        <Text style={styles.finalScore}>
          {game.score.home} - {game.score.away}
        </Text>
        <Text style={[
          styles.finalTeamName,
          game.score.away > game.score.home && styles.winnerText,
        ]}>
          {game.awayTeam.name}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => {
          console.log('[HomeScreen] Open past game log', game.id);
          onOpenHistory(game.id);
        }}
        testID="recent-game-history-link"
      >
        <Text style={styles.historyLinkText}>View game history</Text>
        <ChevronRight size={16} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const recentFinals = mockGames.filter((g) => g.status === 'final').slice(0, 2);

  const handleHistoryPress = useCallback(() => {
    console.log('[HomeScreen] Navigate to game history');
    router.push('/game-history');
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Disc size={22} color={Colors.white} />
            </View>
            <Text style={styles.headerTitle}>PointTracker</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newGameBanner}
          activeOpacity={0.85}
          onPress={() => {
            console.log('[HomeScreen] New game pressed');
            router.push('/game-setup');
          }}
          testID="new-game-button"
        >
          <View style={styles.newGameLeft}>
            <View style={styles.newGameIcon}>
              <PlusCircle size={24} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.newGameTitle}>New Game</Text>
              <Text style={styles.newGameSubtitle}>Set up a new match</Text>
            </View>
          </View>
          <ChevronRight size={24} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Games (my local history)</Text>
          <TouchableOpacity onPress={handleHistoryPress} testID="see-all-history">
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentFinals.map((game) => (
          <FinalGameCard
            key={game.id}
            game={game}
            onOpenHistory={(gameId) => {
              router.push({ pathname: '/past-game-log', params: { gameId } });
            }}
          />
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  newGameBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  newGameLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  newGameIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGameTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  newGameSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 14,
  },
  liveGameCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.success,
    letterSpacing: 0.5,
  },
  matchOngoing: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  liveScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveTeamCol: {
    alignItems: 'center',
    flex: 1,
  },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  teamAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  liveTeamName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark,
  },
  liveScoreCenter: {
    alignItems: 'center',
    flex: 1.5,
  },
  liveScore: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.dark,
    letterSpacing: -1,
  },
  livePointInfo: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  finalGameCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  finalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  finalBadge: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  finalBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  finalDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  finalScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLink: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  finalTeamName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginHorizontal: 16,
  },
  winnerText: {
    color: Colors.dark,
    fontWeight: '700' as const,
  },
});

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, Play, Coffee, PenLine, CheckCircle2, Share2 } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { mockGameEvents } from '@/mocks/games';
import { CaptainSignature, GameEvent } from '@/types/game';
import { useGameSetup } from '@/app/game-setup-context';
import { buildResultShareText } from '@/utils/resultShareText';
import GameStatistics from '@/components/GameStatistics';

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

function CaptainSignatureCard({
  side,
  teamLabel,
  signature,
  onSign,
}: {
  side: 'home' | 'away';
  teamLabel: string;
  signature?: CaptainSignature;
  onSign: (name: string, number: string) => void;
}) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const canSign = name.trim().length > 0 && number.trim().length > 0;

  if (signature) {
    const signedDate = new Date(signature.signedAt);
    return (
      <View style={styles.signatureCard} testID={`captain-signature-${side}-signed`}>
        <View style={styles.signatureHeader}>
          <CheckCircle2 size={18} color={Colors.success} />
          <Text style={styles.signatureTeamLabel}>{teamLabel} CAPTAIN</Text>
        </View>
        <Text style={styles.signatureSignedName}>
          {signature.name} #{signature.number}
        </Text>
        <Text style={styles.signatureSignedTime}>
          Signed {signedDate.toLocaleDateString()} at{' '}
          {signedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.signatureCard} testID={`captain-signature-${side}-form`}>
      <View style={styles.signatureHeader}>
        <PenLine size={18} color={Colors.textTertiary} />
        <Text style={styles.signatureTeamLabel}>{teamLabel} CAPTAIN</Text>
      </View>

      <Text style={styles.inputLabel}>NAME</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Captain name"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          testID={`captain-signature-${side}-name-input`}
        />
      </View>

      <Text style={styles.inputLabel}>NUMBER</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="00"
          placeholderTextColor={Colors.textTertiary}
          value={number}
          onChangeText={setNumber}
          keyboardType="number-pad"
          returnKeyType="done"
          testID={`captain-signature-${side}-number-input`}
        />
      </View>

      <TouchableOpacity
        style={[styles.signButton, !canSign && styles.signButtonDisabled]}
        onPress={() => {
          if (!canSign) return;
          onSign(name, number);
          setName('');
          setNumber('');
        }}
        disabled={!canSign}
        testID={`captain-signature-${side}-submit`}
      >
        <Text style={styles.signButtonText}>Sign as captain</Text>
      </TouchableOpacity>
    </View>
  );
}

function AttackStartPicker({
  homeLabel,
  awayLabel,
  value,
  onSelect,
}: {
  homeLabel: string;
  awayLabel: string;
  value?: 'home' | 'away';
  onSelect: (side: 'home' | 'away') => void;
}) {
  return (
    <View style={styles.signatureCard} testID="attack-start-picker">
      <View style={styles.signatureHeader}>
        <Play size={18} color={Colors.textTertiary} />
        <Text style={styles.signatureTeamLabel}>TEAM THAT STARTED ON OFFENSE</Text>
      </View>
      <View style={styles.attackStartRow}>
        <TouchableOpacity
          style={[styles.attackStartOption, value === 'home' && styles.attackStartOptionSelected]}
          onPress={() => onSelect('home')}
          testID="attack-start-home-button"
        >
          <Text
            style={[
              styles.attackStartOptionText,
              value === 'home' && styles.attackStartOptionTextSelected,
            ]}
          >
            {homeLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.attackStartOption, value === 'away' && styles.attackStartOptionSelected]}
          onPress={() => onSelect('away')}
          testID="attack-start-away-button"
        >
          <Text
            style={[
              styles.attackStartOptionText,
              value === 'away' && styles.attackStartOptionTextSelected,
            ]}
          >
            {awayLabel}
          </Text>
        </TouchableOpacity>
      </View>
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
  const { pastGames, pastGameEvents, signPastGame, setPastGameAttackStartTeam } = useGameSetup();

  const game = useMemo(
    () => pastGames.find((item) => item.id === selectedGameId) ?? null,
    [pastGames, selectedGameId],
  );
  const events = useMemo(
    () => (selectedGameId ? pastGameEvents[selectedGameId] ?? [] : []),
    [pastGameEvents, selectedGameId],
  );
  const logEvents = events.length > 0 ? events : mockGameEvents;
  const chronologicalLogEvents = useMemo(() => [...logEvents].reverse(), [logEvents]);
  const hasGame = Boolean(game);
  const hasEvents = logEvents.length > 0;
  const [activeTab, setActiveTab] = useState<'stats' | 'log'>('log');
  const canShareResults = Boolean(
    game?.homeCaptainSignature && game?.awayCaptainSignature && game?.attackStartTeam,
  );

  const handleShareResults = useCallback(async () => {
    if (!game) return;
    const text = buildResultShareText(game, events);
    try {
      await Share.share({ message: text });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Share failed', message);
    }
  }, [game, events]);

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

            <SectionDivider label="CAPTAIN SIGNATURES" />
            <CaptainSignatureCard
              side="home"
              teamLabel={game?.homeTeam.abbreviation ?? 'HOME'}
              signature={game?.homeCaptainSignature}
              onSign={(name, number) => {
                if (game) signPastGame(game.id, 'home', { name, number });
              }}
            />
            <CaptainSignatureCard
              side="away"
              teamLabel={game?.awayTeam.abbreviation ?? 'AWAY'}
              signature={game?.awayCaptainSignature}
              onSign={(name, number) => {
                if (game) signPastGame(game.id, 'away', { name, number });
              }}
            />
            <AttackStartPicker
              homeLabel={game?.homeTeam.abbreviation ?? 'HOME'}
              awayLabel={game?.awayTeam.abbreviation ?? 'AWAY'}
              value={game?.attackStartTeam}
              onSelect={(side) => {
                if (game) setPastGameAttackStartTeam(game.id, side);
              }}
            />

            {canShareResults ? (
              <TouchableOpacity
                style={styles.shareResultsButton}
                onPress={handleShareResults}
                testID="share-results-button"
              >
                <Share2 size={18} color={Colors.white} />
                <Text style={styles.shareResultsButtonText}>Share results</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.shareResultsHint} testID="share-results-hint">
                <Text style={styles.shareResultsHintText}>
                  Both captains must sign and the team that started on offense must be selected
                  before results can be shared.
                </Text>
              </View>
            )}

            <View style={styles.logTabs}>
              <TouchableOpacity
                style={[styles.logTab, activeTab === 'stats' && styles.logTabActive]}
                onPress={() => setActiveTab('stats')}
                testID="statistics-tab"
              >
                <Text
                  style={[styles.logTabText, activeTab === 'stats' && styles.logTabTextActive]}
                >
                  Statistics
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logTab, activeTab === 'log' && styles.logTabActive]}
                onPress={() => setActiveTab('log')}
                testID="game-log-tab"
              >
                <Text style={[styles.logTabText, activeTab === 'log' && styles.logTabTextActive]}>
                  Game log
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'stats' && game ? (
              <GameStatistics homeTeam={game.homeTeam} awayTeam={game.awayTeam} events={events} />
            ) : hasEvents ? (
              <>
                <SectionDivider label="GAME LOG" />

                {chronologicalLogEvents.map((event) => {
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
  signatureCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  signatureTeamLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  signatureSignedName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark,
  },
  signatureSignedTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark,
  },
  signButton: {
    backgroundColor: Colors.dark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  signButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  signButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  attackStartRow: {
    flexDirection: 'row',
    gap: 10,
  },
  attackStartOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attackStartOptionSelected: {
    backgroundColor: Colors.dark,
    borderColor: Colors.dark,
  },
  attackStartOptionText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.dark,
    letterSpacing: 0.4,
  },
  attackStartOptionTextSelected: {
    color: Colors.white,
  },
  shareResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  shareResultsButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  shareResultsHint: {
    backgroundColor: Colors.gray100,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  shareResultsHintText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    lineHeight: 17,
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
  logTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.gray200,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  logTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  logTabActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  logTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  logTabTextActive: {
    color: Colors.primary,
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

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
import { Clock, Play, Coffee } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { GameEvent } from '@/types/game';
import { useGameSetup } from '@/app/game-setup-context';

function ScoreHeader() {
  const { homeTeam, awayTeam, homeScore, awayScore, liveEvents } = useGameSetup();
  const isSecondPeriod = React.useMemo(
    () => liveEvents.some((e) => e.type === 'halftime'),
    [liveEvents],
  );
  const period = isSecondPeriod ? 2 : 1;
  return (
    <View style={styles.scoreHeader}>
      <View style={styles.scoreCol}>
        <Text style={styles.scoreNum}>{homeScore}</Text>
        <Text style={styles.scoreTeamLabel}>{homeTeam.abbreviation}</Text>
      </View>
      <View style={styles.scoreTimeCol}>
        <Text style={styles.scoreTimeText}>PERIOD {period}</Text>
      </View>
      <View style={styles.scoreCol}>
        <Text style={styles.scoreNum}>{awayScore}</Text>
        <Text style={styles.scoreTeamLabel}>{awayTeam.abbreviation}</Text>
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

function GoalEventCard({
  event,
  canEdit,
  onEdit,
  onDelete,
}: {
  event: GameEvent;
  canEdit: boolean;
  onEdit: (event: GameEvent) => void;
  onDelete: (event: GameEvent) => void;
}) {
  const isHome = event.teamId === 'home';

  return (
    <View style={styles.eventCard} testID="goal-event-card">
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
      </View>

      {event.scoreAtEvent || canEdit ? (
        <View style={styles.eventFooter}>
          {event.scoreAtEvent ? (
            <Text style={styles.eventScore}>
              Score: {event.scoreAtEvent.home} - {event.scoreAtEvent.away}
            </Text>
          ) : (
            <View style={styles.eventFooterSpacer} />
          )}

          {canEdit ? (
            <View style={styles.eventActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEdit(event)}
                testID={`edit-goal-${event.id}`}
              >
                <Text style={styles.editBtnText}>edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDelete(event)}
                testID={`delete-goal-${event.id}`}
              >
                <Text style={styles.deleteBtnText}>delete</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function TimeoutEvent({
  event,
  canEdit,
  onEdit,
  onDelete,
}: {
  event: GameEvent;
  canEdit: boolean;
  onEdit: (event: GameEvent) => void;
  onDelete: (event: GameEvent) => void;
}) {
  return (
    <View style={styles.timeoutCard} testID="timeout-event-card">
      <View style={styles.timeoutLeft}>
        <Clock size={18} color={Colors.textTertiary} />
        <View>
          <Text style={styles.timeoutTitle}>Timeout</Text>
          <Text style={styles.timeoutDesc}>{event.description}</Text>
        </View>
      </View>
      <View style={styles.timeoutRight}>
        <Text style={styles.eventTime}>{event.gameTime}</Text>
        {canEdit ? (
          <View style={styles.eventActions}>
            <TouchableOpacity
              onPress={() => onEdit(event)}
              testID={`edit-timeout-${event.id}`}
            >
              <Text style={styles.editBtnText}>edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(event)}
              testID={`delete-timeout-${event.id}`}
            >
              <Text style={styles.deleteBtnText}>delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function HalftimeEvent({
  event,
  canDelete,
  onDelete,
}: {
  event: GameEvent;
  canDelete: boolean;
  onDelete: (event: GameEvent) => void;
}) {
  return (
    <View style={styles.halftimeCard} testID="halftime-event-card">
      <View style={styles.timeoutLeft}>
        <Coffee size={18} color={Colors.textTertiary} />
        <View>
          <Text style={styles.timeoutTitle}>Half-time</Text>
          <Text style={styles.timeoutDesc}>Break</Text>
        </View>
      </View>
      <View style={styles.timeoutRight}>
        <Text style={styles.eventTime}>{event.gameTime}</Text>
        {canDelete ? (
          <TouchableOpacity
            onPress={() => onDelete(event)}
            testID={`delete-halftime-${event.id}`}
          >
            <Text style={styles.deleteBtnText}>delete</Text>
          </TouchableOpacity>
        ) : null}
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

export default function GameLogScreen() {
  const router = useRouter();
  const { liveEvents, isGameEnded, updateTimeoutEvent, removeLiveEvent } = useGameSetup();
  const justNowEvents = liveEvents.slice(0, 2);
  const earlierEvents = liveEvents.slice(2);
  const hasEvents = liveEvents.length > 0;

  const handleEditGoal = React.useCallback(
    (event: GameEvent) => {
      console.log('GameLog: edit goal event', event);
      router.push({
        pathname: '/goal-details',
        params: {
          eventId: event.id,
          side: event.teamId === 'away' ? 'away' : 'home',
          time: event.gameTime,
        },
      } as Href);
    },
    [router],
  );

  const handleEditTimeout = React.useCallback(
    (event: GameEvent) => {
      console.log('GameLog: edit timeout event', event);
      Alert.alert('Edit timeout', 'Select the team for this timeout.', [
        {
          text: 'Home team',
          onPress: () => updateTimeoutEvent(event.id, 'home'),
        },
        {
          text: 'Away team',
          onPress: () => updateTimeoutEvent(event.id, 'away'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    },
    [updateTimeoutEvent],
  );

  const handleDeleteEvent = React.useCallback(
    (event: GameEvent) => {
      console.log('GameLog: delete event', event);
      Alert.alert('Delete event', 'This will remove the event from the log.', [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeLiveEvent(event.id),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    },
    [removeLiveEvent],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Game Log',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.dark,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScoreHeader />

        {hasEvents ? (
          <>
            <SectionDivider label="JUST NOW" />

            {justNowEvents.map((event) => {
              if (event.type === 'goal')
                return (
                  <GoalEventCard
                    key={event.id}
                    event={event}
                    canEdit={!isGameEnded}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteEvent}
                  />
                );
              if (event.type === 'timeout')
                return (
                  <TimeoutEvent
                    key={event.id}
                    event={event}
                    canEdit={!isGameEnded}
                    onEdit={handleEditTimeout}
                    onDelete={handleDeleteEvent}
                  />
                );
              if (event.type === 'halftime')
                return (
                  <HalftimeEvent
                    key={event.id}
                    event={event}
                    canDelete={!isGameEnded}
                    onDelete={handleDeleteEvent}
                  />
                );
              if (event.type === 'game_start') return <GameStartEvent key={event.id} event={event} />;
              return null;
            })}

            {earlierEvents.map((event) => {
              if (event.type === 'goal')
                return (
                  <GoalEventCard
                    key={event.id}
                    event={event}
                    canEdit={!isGameEnded}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteEvent}
                  />
                );
              if (event.type === 'timeout')
                return (
                  <TimeoutEvent
                    key={event.id}
                    event={event}
                    canEdit={!isGameEnded}
                    onEdit={handleEditTimeout}
                    onDelete={handleDeleteEvent}
                  />
                );
              if (event.type === 'halftime')
                return (
                  <HalftimeEvent
                    key={event.id}
                    event={event}
                    canDelete={!isGameEnded}
                    onDelete={handleDeleteEvent}
                  />
                );
              if (event.type === 'game_start') return <GameStartEvent key={event.id} event={event} />;
              return null;
            })}
          </>
        ) : (
          <View style={styles.emptyState} testID="game-log-empty">
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>Log events will show up once the game starts.</Text>
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
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark,
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
  editBtn: {
    paddingHorizontal: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  eventFooterSpacer: {
    flex: 1,
  },
  eventScore: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.dark,
    flex: 1,
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

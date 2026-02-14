import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { Clock, Play, Coffee } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { mockGameEvents } from '@/mocks/games';
import { GameEvent } from '@/types/game';

function ScoreHeader() {
  return (
    <View style={styles.scoreHeader}>
      <View style={styles.scoreCol}>
        <Text style={styles.scoreNum}>13</Text>
        <Text style={styles.scoreTeamLabel}>FLYERS</Text>
      </View>
      <View style={styles.scoreTimeCol}>
        <Text style={styles.scoreTimeText}>14:02</Text>
        <Text style={styles.scorePeriod}>PERIOD 2</Text>
      </View>
      <View style={styles.scoreCol}>
        <Text style={styles.scoreNum}>11</Text>
        <Text style={styles.scoreTeamLabel}>GRAVITY</Text>
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
  const isHome = event.teamId === 't1';

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
        <View style={styles.eventPlayerCol}>
          <Text style={styles.eventPlayerLabel}>GOAL</Text>
          <View
            style={[
              styles.eventPlayerNumber,
              { backgroundColor: isHome ? Colors.primary : Colors.dark },
            ]}
          >
            <Text style={styles.eventPlayerNumText}>
              {event.scorerNumber}
            </Text>
          </View>
          <Text style={styles.eventPlayerName}>{event.scorerName}</Text>
        </View>

        {event.assistNumber ? (
          <>
            <Text style={styles.eventDash}>—</Text>
            <View style={styles.eventPlayerCol}>
              <Text style={styles.eventPlayerLabel}>ASSIST</Text>
              <View
                style={[
                  styles.eventPlayerNumber,
                  { backgroundColor: isHome ? Colors.accent : Colors.darkSecondary },
                ]}
              >
                <Text style={styles.eventPlayerNumText}>
                  {event.assistNumber}
                </Text>
              </View>
              <Text style={styles.eventPlayerName}>{event.assistName}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.eventDash}>—</Text>
            <View style={styles.eventPlayerCol}>
              <Text style={styles.eventPlayerLabel}>ASSIST</Text>
              <Text style={styles.callahanText}>CALLAHAN</Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>edit</Text>
        </TouchableOpacity>
      </View>

      {event.scoreAtEvent && (
        <Text style={styles.eventScore}>
          Score: {event.scoreAtEvent.home} - {event.scoreAtEvent.away}
        </Text>
      )}

      {!event.isSynced && (
        <View style={styles.syncStatus}>
          <Text style={styles.syncPending}>pending</Text>
          <Text style={styles.syncLabel}>SYNCING</Text>
        </View>
      )}
    </View>
  );
}

function TimeoutEvent({ event }: { event: GameEvent }) {
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
        <TouchableOpacity>
          <Text style={styles.editBtnText}>edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HalftimeEvent({ event }: { event: GameEvent }) {
  return (
    <View style={styles.halftimeDivider}>
      <View style={styles.dividerLine} />
      <View style={styles.halftimeBadge}>
        <Coffee size={14} color={Colors.textSecondary} />
        <Text style={styles.halftimeText}>HALF-TIME</Text>
        <Text style={styles.halftimeTime}>{event.gameTime}</Text>
      </View>
      <View style={styles.dividerLine} />
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
  const justNowEvents = mockGameEvents.slice(0, 2);
  const earlierEvents = mockGameEvents.slice(2);

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

        <SectionDivider label="JUST NOW" />

        {justNowEvents.map((event) => {
          if (event.type === 'goal') return <GoalEventCard key={event.id} event={event} />;
          if (event.type === 'timeout') return <TimeoutEvent key={event.id} event={event} />;
          return null;
        })}

        <SectionDivider label="EARLIER" />

        {earlierEvents.map((event) => {
          if (event.type === 'goal') return <GoalEventCard key={event.id} event={event} />;
          if (event.type === 'timeout') return <TimeoutEvent key={event.id} event={event} />;
          if (event.type === 'halftime') return <HalftimeEvent key={event.id} event={event} />;
          if (event.type === 'game_start') return <GameStartEvent key={event.id} event={event} />;
          return null;
        })}
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
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  scoreCol: {
    alignItems: 'center',
    flex: 1,
  },
  scoreNum: {
    fontSize: 36,
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
  scoreTimeCol: {
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scoreTimeText: {
    fontSize: 18,
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
    marginVertical: 16,
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
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventPlayerCol: {
    alignItems: 'center',
    flex: 1,
  },
  eventPlayerLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  eventPlayerNumber: {
    width: 52,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eventPlayerNumText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  eventPlayerName: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  eventDash: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginHorizontal: 4,
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
  editBtnText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  eventScore: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark,
    marginTop: 10,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  syncPending: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  syncLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  timeoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  timeoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeoutTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark,
  },
  timeoutDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timeoutRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  halftimeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 10,
  },
  halftimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  halftimeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  halftimeTime: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  gameStartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gameStartText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});

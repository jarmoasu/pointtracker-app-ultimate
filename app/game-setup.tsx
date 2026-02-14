import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Wifi,
  KeyRound,
  Play,
  UserPlus,
  Upload,
  Pencil,
  X,
  RefreshCw,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import { mockTeams } from '@/mocks/games';

export default function GameSetupScreen() {
  const router = useRouter();
  const [streamId, setStreamId] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [homeTeam, setHomeTeam] = useState('Hurricanes');
  const [awayTeam, setAwayTeam] = useState('Titans');
  const [activeRosterTab, setActiveRosterTab] = useState<'home' | 'away'>('home');

  const homePlayers = mockTeams[0].players;
  const awayPlayers = mockTeams[1].players;
  const currentPlayers = activeRosterTab === 'home' ? homePlayers : awayPlayers;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Game Setup',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.dark,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Stream Connection</Text>
        <View style={styles.streamCard}>
          <Text style={styles.inputLabel}>STREAM ID</Text>
          <View style={styles.inputRow}>
            <Wifi size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="e.g. finals_field_1"
              placeholderTextColor={Colors.textTertiary}
              value={streamId}
              onChangeText={setStreamId}
              testID="stream-id-input"
            />
          </View>

          <Text style={styles.inputLabel}>CLAIM CODE</Text>
          <View style={styles.inputRow}>
            <KeyRound size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="Enter claim code"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={claimCode}
              onChangeText={setClaimCode}
              testID="claim-code-input"
            />
          </View>

          <View style={styles.connectionStatus}>
            <View style={styles.connectionDot} />
            <Text style={styles.connectionText}>CONNECTION STABLE</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Matchup</Text>
        <View style={styles.matchupRow}>
          <View style={styles.matchupTeam}>
            <Text style={styles.matchupLabel}>HOME TEAM</Text>
            <View style={styles.teamInput}>
              <TextInput
                style={styles.teamInputText}
                value={homeTeam}
                onChangeText={setHomeTeam}
                testID="home-team-input"
              />
            </View>
          </View>
          <Text style={styles.vsLabel}>VS</Text>
          <View style={styles.matchupTeam}>
            <Text style={styles.matchupLabel}>AWAY TEAM</Text>
            <View style={styles.teamInput}>
              <TextInput
                style={styles.teamInputText}
                value={awayTeam}
                onChangeText={setAwayTeam}
                testID="away-team-input"
              />
            </View>
          </View>
        </View>

        <View style={styles.rosterHeader}>
          <Text style={styles.sectionTitle}>Roster Management</Text>
          <TouchableOpacity style={styles.syncBtn} testID="sync-button">
            <RefreshCw size={14} color={Colors.primary} />
            <Text style={styles.syncText}>SYNC</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rosterTabs}>
          <TouchableOpacity
            style={[
              styles.rosterTab,
              activeRosterTab === 'home' && styles.rosterTabActive,
            ]}
            onPress={() => setActiveRosterTab('home')}
            testID="home-roster-tab"
          >
            <Text
              style={[
                styles.rosterTabText,
                activeRosterTab === 'home' && styles.rosterTabTextActive,
              ]}
            >
              HOME ({homePlayers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rosterTab,
              activeRosterTab === 'away' && styles.rosterTabActive,
            ]}
            onPress={() => setActiveRosterTab('away')}
            testID="away-roster-tab"
          >
            <Text
              style={[
                styles.rosterTabText,
                activeRosterTab === 'away' && styles.rosterTabTextActive,
              ]}
            >
              AWAY ({awayPlayers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {currentPlayers.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <View style={styles.playerNumber}>
              <Text style={styles.playerNumberText}>{player.number}</Text>
            </View>
            <Text style={styles.playerName}>{player.name}</Text>
            <View style={styles.playerActions}>
              <TouchableOpacity style={styles.playerActionBtn}>
                <Pencil size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playerActionBtn}>
                <X size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addPlayerBtn} testID="add-player-button">
          <UserPlus size={18} color={Colors.textSecondary} />
          <Text style={styles.addPlayerText}>
            ADD {activeRosterTab === 'home' ? 'HOME' : 'AWAY'} PLAYER
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.importBtn} testID="import-roster-button">
          <Upload size={18} color={Colors.textSecondary} />
          <Text style={styles.importText}>IMPORT ROSTER (CSV)</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/live-scoring')}
          testID="start-match-button"
        >
          <Play size={20} color={Colors.white} fill={Colors.white} />
          <Text style={styles.startBtnText}>START MATCH</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginTop: 20,
    marginBottom: 14,
  },
  streamCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.gray200,
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
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.success,
    letterSpacing: 0.5,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  matchupTeam: {
    flex: 1,
  },
  matchupLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  teamInput: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  teamInputText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.dark,
  },
  vsLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    paddingBottom: 14,
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  rosterTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.gray200,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  rosterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  rosterTabActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  rosterTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  rosterTabTextActive: {
    color: Colors.primary,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  playerNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playerNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.dark,
    flex: 1,
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  playerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.gray300,
    borderRadius: 12,
    marginBottom: 10,
  },
  addPlayerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.gray300,
    borderRadius: 12,
  },
  importText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.dark,
    borderRadius: 16,
    paddingVertical: 18,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 1,
  },
});

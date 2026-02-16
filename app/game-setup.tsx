import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import {
  Wifi,
  KeyRound,
  Play,
  UserPlus,
  Upload,
  Pencil,
  X,
} from 'lucide-react-native';

import Colors from '@/constants/colors';
import { Player } from '@/types/game';
import { useGameSetup, TeamSide } from '@/app/game-setup-context';

export default function GameSetupScreen() {
  const router = useRouter();
  const [streamId, setStreamId] = useState<string>('');
  const [claimCode, setClaimCode] = useState<string>('');
  const {
    homeTeamName,
    awayTeamName,
    homePlayers,
    awayPlayers,
    setHomeTeamName,
    setAwayTeamName,
    addPlayer,
    updatePlayer,
    removePlayer,
    resetLiveGame,
  } = useGameSetup();
  const [activeRosterTab, setActiveRosterTab] = useState<TeamSide>('home');
  const [isStartConfirmVisible, setIsStartConfirmVisible] = useState<boolean>(false);
  const [playerNameInput, setPlayerNameInput] = useState<string>('');
  const [playerNumberInput, setPlayerNumberInput] = useState<string>('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    console.log('GameSetup initial teams', {
      homeTeamName,
      awayTeamName,
      homeCount: homePlayers.length,
      awayCount: awayPlayers.length,
    });
  }, [homeTeamName, awayTeamName, homePlayers.length, awayPlayers.length]);

  const currentPlayers = activeRosterTab === 'home' ? homePlayers : awayPlayers;

  const resetPlayerForm = () => {
    setPlayerNameInput('');
    setPlayerNumberInput('');
    setEditingPlayerId(null);
  };

  const openEditPlayer = (player: Player) => {
    console.log('GameSetup open edit player', { playerId: player.id, activeRosterTab });
    setPlayerNameInput(player.name);
    setPlayerNumberInput(player.number);
    setEditingPlayerId(player.id);
  };

  const handleSavePlayer = () => {
    const trimmedName = playerNameInput.trim();
    const trimmedNumber = playerNumberInput.trim();

    if (!trimmedName && !trimmedNumber) {
      Alert.alert('Missing details', 'Please enter a player name or jersey number.');
      return;
    }

    addPlayer(activeRosterTab, trimmedName, trimmedNumber);
    resetPlayerForm();
  };

  const handleUpdatePlayer = () => {
    if (!editingPlayerId) {
      resetPlayerForm();
      return;
    }

    const trimmedName = playerNameInput.trim();
    const trimmedNumber = playerNumberInput.trim();

    if (!trimmedName && !trimmedNumber) {
      Alert.alert('Missing details', 'Please enter a player name or jersey number.');
      return;
    }

    updatePlayer(activeRosterTab, editingPlayerId, {
      name: trimmedName,
      number: trimmedNumber,
    });
    resetPlayerForm();
  };

  const handleDeletePlayer = (playerId: string) => {
    Alert.alert('Remove player?', 'This removes the player from the roster.', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => console.log('GameSetup remove player cancelled'),
      },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removePlayer(activeRosterTab, playerId),
      },
    ]);
  };

  const handleStartPress = () => {
    console.log('GameSetup start pressed');
    setIsStartConfirmVisible(true);
  };

  const handleConfirmContinue = () => {
    console.log('GameSetup confirm continue - starting new game');
    resetLiveGame();
    setIsStartConfirmVisible(false);
    router.push('/live-scoring' as Href);
  };

  const handleConfirmBack = () => {
    console.log('GameSetup confirm back to setup');
    setIsStartConfirmVisible(false);
  };

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

          <TouchableOpacity
            style={styles.claimStreamButton}
            activeOpacity={0.85}
            testID="claim-stream-info-button"
          >
            <Text style={styles.claimStreamText}>CLAIM STREAM INFO</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Matchup</Text>
        <View style={styles.matchupRow}>
          <View style={styles.matchupTeam}>
            <Text style={styles.matchupLabel}>HOME TEAM</Text>
            <View style={styles.teamInput}>
              <TextInput
                style={styles.teamInputText}
                value={homeTeamName}
                onChangeText={setHomeTeamName}
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
                value={awayTeamName}
                onChangeText={setAwayTeamName}
                testID="away-team-input"
              />
            </View>
          </View>
        </View>

        <View style={styles.rosterHeader}>
          <Text style={styles.sectionTitle}>Roster Management</Text>
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

        <View style={styles.inlinePlayerCard}>
          <Text style={styles.inputLabel}>PLAYER NAME</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Player name"
              placeholderTextColor={Colors.textTertiary}
              value={playerNameInput}
              onChangeText={setPlayerNameInput}
              testID="player-name-input"
            />
          </View>

          <Text style={styles.inputLabel}>JERSEY NUMBER</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="00"
              placeholderTextColor={Colors.textTertiary}
              value={playerNumberInput}
              onChangeText={setPlayerNumberInput}
              keyboardType="number-pad"
              testID="player-number-input"
            />
          </View>

          <View style={styles.inlinePlayerActions}>
            {editingPlayerId ? (
              <TouchableOpacity
                style={styles.inlineCancelBtn}
                onPress={resetPlayerForm}
                testID="player-inline-cancel"
              >
                <Text style={styles.inlineCancelText}>Cancel edit</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.inlineSaveBtn}
              onPress={editingPlayerId ? handleUpdatePlayer : handleSavePlayer}
              testID="add-player-button"
            >
              <UserPlus size={18} color={Colors.white} />
              <Text style={styles.inlineSaveText}>
                {editingPlayerId ? 'Update' : 'Add'} {activeRosterTab === 'home' ? 'Home' : 'Away'} Player
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {currentPlayers.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <View style={styles.playerNumber}>
              <Text style={styles.playerNumberText}>{player.number}</Text>
            </View>
            <Text style={styles.playerName}>{player.name}</Text>
            <View style={styles.playerActions}>
              <TouchableOpacity
                style={styles.playerActionBtn}
                onPress={() => openEditPlayer(player)}
                testID={`edit-player-${player.id}`}
              >
                <Pencil size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.playerActionBtn}
                onPress={() => handleDeletePlayer(player.id)}
                testID={`remove-player-${player.id}`}
              >
                <X size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.importBtn}
          testID="import-roster-button"
          onPress={() => Alert.alert('Coming soon', 'CSV import will be available soon.')}
        >
          <Upload size={18} color={Colors.textSecondary} />
          <Text style={styles.importText}>IMPORT ROSTER (CSV)</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.85}
          onPress={handleStartPress}
          testID="start-match-button"
        >
          <Play size={20} color={Colors.white} fill={Colors.white} />
          <Text style={styles.startBtnText}>START MATCH</Text>
        </TouchableOpacity>
      </View>

      {isStartConfirmVisible && (
        <View style={styles.confirmOverlay} testID="start-confirm-overlay">
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Start Game</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to start the game? The game clock will begin when you press Continue.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmBackBtn}
                onPress={handleConfirmBack}
                testID="start-confirm-back"
              >
                <Text style={styles.confirmBackText}>Back to setup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmContinueBtn}
                onPress={handleConfirmContinue}
                testID="start-confirm-continue"
              >
                <Text style={styles.confirmContinueText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
  claimStreamButton: {
    backgroundColor: Colors.dark,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  claimStreamText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.8,
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
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  inlinePlayerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 16,
  },
  inlinePlayerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  inlineSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark,
    borderRadius: 12,
    paddingVertical: 14,
  },
  inlineSaveText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  inlineCancelBtn: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  inlineCancelText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 10,
  },
  confirmMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBackBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  confirmBackText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  confirmContinueBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark,
  },
  confirmContinueText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.4,
  },
});

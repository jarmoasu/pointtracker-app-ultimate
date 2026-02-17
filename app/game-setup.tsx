import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Pressable,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '@/constants/colors';
import { Player } from '@/types/game';
import { useGameSetup, TeamSide } from '@/app/game-setup-context';

type CsvRosterRow = { teamName: string; playerName: string; jerseyNumber: string };

const CSV_LAST_SUCCESSFUL_URL_KEY = 'pointtracker.csvLastSuccessfulUrl.v1';
// Back-compat: earlier builds stored an array of recent URLs under this key.
const CSV_URL_HISTORY_KEY = 'pointtracker.csvUrlHistory.v1';
const CSV_TEST_AND_EXAMPLE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQtm2zf2JpJ4saXJXhkMtVf9g73WUFMzt0LgE6fyxd4-mD-2Pca8Z8UAXPasMJwHYYX0joGfTfuRAw_/pub?output=csv';

function parseCsvLine(line: string): string[] {
  // Basic CSV parsing with support for quotes and escaped quotes ("")
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function normalizeHeaderKey(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseRosterCsv(text: string): {
  teams: string[];
  rosterByTeam: Record<string, Array<{ name: string; number: string }>>;
  rowCount: number;
} {
  const cleaned = text.replace(/\uFEFF/g, '').trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { teams: [], rosterByTeam: {}, rowCount: 0 };
  }

  const header = parseCsvLine(lines[0]).map((h) => normalizeHeaderKey(h));
  const teamIdx = header.findIndex((h) => h === 'team name');
  const playerIdx = header.findIndex((h) => h === 'player name');
  const jerseyIdx = header.findIndex((h) => h === 'jersey number');

  if (teamIdx === -1 || playerIdx === -1 || jerseyIdx === -1) {
    throw new Error(
      `CSV must include headers: "Team Name", "Player Name", "Jersey Number". Found: ${header
        .map((h) => `"${h}"`)
        .join(', ')}`,
    );
  }

  const rosterByTeam: Record<string, Array<{ name: string; number: string }>> = {};
  let rowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row: CsvRosterRow = {
      teamName: (cols[teamIdx] ?? '').trim(),
      playerName: (cols[playerIdx] ?? '').trim(),
      jerseyNumber: (cols[jerseyIdx] ?? '').trim(),
    };

    if (!row.teamName) continue;
    if (!row.playerName && !row.jerseyNumber) continue;

    if (!rosterByTeam[row.teamName]) rosterByTeam[row.teamName] = [];
    rosterByTeam[row.teamName].push({ name: row.playerName, number: row.jerseyNumber });
    rowCount++;
  }

  const teams = Object.keys(rosterByTeam).sort((a, b) => a.localeCompare(b));
  return { teams, rosterByTeam, rowCount };
}

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
    resetRoster,
    replaceRosterForSide,
  } = useGameSetup();
  const [activeRosterTab, setActiveRosterTab] = useState<TeamSide>('home');
  const [isStartConfirmVisible, setIsStartConfirmVisible] = useState<boolean>(false);
  const [playerNameInput, setPlayerNameInput] = useState<string>('');
  const [playerNumberInput, setPlayerNumberInput] = useState<string>('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  const [isCsvImportVisible, setIsCsvImportVisible] = useState<boolean>(false);
  const [csvUrlInput, setCsvUrlInput] = useState<string>('');
  const [csvLastSuccessfulUrl, setCsvLastSuccessfulUrl] = useState<string>('');
  const [isCsvLoading, setIsCsvLoading] = useState<boolean>(false);
  const [csvTeams, setCsvTeams] = useState<string[]>([]);
  const [csvRosterByTeam, setCsvRosterByTeam] = useState<
    Record<string, Array<{ name: string; number: string }>>
  >({});

  useEffect(() => {
    console.log('GameSetup initial teams', {
      homeTeamName,
      awayTeamName,
      homeCount: homePlayers.length,
      awayCount: awayPlayers.length,
    });
  }, [homeTeamName, awayTeamName, homePlayers.length, awayPlayers.length]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const rawLast = await AsyncStorage.getItem(CSV_LAST_SUCCESSFUL_URL_KEY);
        if (rawLast) {
          const trimmed = rawLast.trim();
          if (trimmed && trimmed !== CSV_TEST_AND_EXAMPLE_URL) {
            if (isMounted) setCsvLastSuccessfulUrl(trimmed);
            return;
          }

          // Don't allow the test URL to become the "last successful" option.
          if (trimmed === CSV_TEST_AND_EXAMPLE_URL) {
            await AsyncStorage.removeItem(CSV_LAST_SUCCESSFUL_URL_KEY);
          }
        }

        // Back-compat: if an older "recent URLs" list exists, migrate the first item.
        const rawHistory = await AsyncStorage.getItem(CSV_URL_HISTORY_KEY);
        if (!rawHistory) return;

        const parsed = JSON.parse(rawHistory);
        if (!Array.isArray(parsed)) return;
        const first = parsed.find((v) => typeof v === 'string' && v.trim().length > 0);
        if (!first) return;

        const migrated = (first as string).trim();
        if (!migrated || migrated === CSV_TEST_AND_EXAMPLE_URL) return;
        await AsyncStorage.setItem(CSV_LAST_SUCCESSFUL_URL_KEY, migrated);
        if (isMounted) setCsvLastSuccessfulUrl(migrated);
      } catch {
        // ignore history load failures
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentPlayers = activeRosterTab === 'home' ? homePlayers : awayPlayers;

  const resetPlayerForm = () => {
    setPlayerNameInput('');
    setPlayerNumberInput('');
    setEditingPlayerId(null);
  };

  const rememberSuccessfulCsvUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (trimmed === CSV_TEST_AND_EXAMPLE_URL) return;

    setCsvLastSuccessfulUrl(trimmed);
    void AsyncStorage.setItem(CSV_LAST_SUCCESSFUL_URL_KEY, trimmed);
  };

  useEffect(() => {
    resetRoster();
    setPlayerNameInput('');
    setPlayerNumberInput('');
    setEditingPlayerId(null);
    setActiveRosterTab('home');
    console.log('GameSetup cleared roster for new setup');
  }, [resetRoster]);

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

  const closeCsvImport = () => {
    setIsCsvImportVisible(false);
    setIsCsvLoading(false);
    setCsvTeams([]);
    setCsvRosterByTeam({});
  };

  const handleFetchCsv = async () => {
    const url = csvUrlInput.trim();
    if (!url) {
      Alert.alert('Missing URL', 'Paste a CSV URL to import.');
      return;
    }

    try {
      setIsCsvLoading(true);
      setCsvTeams([]);
      setCsvRosterByTeam({});

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const csvText = await res.text();
      const { teams, rosterByTeam, rowCount } = parseRosterCsv(csvText);

      if (teams.length === 0) {
        Alert.alert('No teams found', 'No importable rows were found in that CSV.');
        return;
      }

      rememberSuccessfulCsvUrl(url);
      console.log('GameSetup CSV parsed', { teamCount: teams.length, rowCount });
      setCsvTeams(teams);
      setCsvRosterByTeam(rosterByTeam);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Import failed', message);
    } finally {
      setIsCsvLoading(false);
    }
  };

  const confirmImportTeam = (teamName: string) => {
    const roster = csvRosterByTeam[teamName] ?? [];
    const side = activeRosterTab;

    Alert.alert(
      'Import roster?',
      `Import "${teamName}" into ${side.toUpperCase()} and replace the current roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'default',
          onPress: () => {
            replaceRosterForSide(side, { teamName, players: roster });
            resetPlayerForm();
            closeCsvImport();
          },
        },
      ],
    );
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
          onPress={() => setIsCsvImportVisible(true)}
        >
          <Upload size={18} color={Colors.textSecondary} />
          <Text style={styles.importText}>IMPORT ROSTER (CSV)</Text>
        </TouchableOpacity>

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
            <Text style={styles.claimStreamText}>CLAIM STREAM</Text>
          </TouchableOpacity>
        </View>

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

      <Modal
        visible={isCsvImportVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCsvImport}
      >
        <Pressable style={styles.confirmOverlay} onPress={closeCsvImport} testID="csv-import-overlay">
          <Pressable style={styles.csvCard} onPress={() => {}} testID="csv-import-card">
            <Text style={styles.confirmTitle}>Import CSV</Text>
            <Text style={styles.confirmMessage}>
              Paste a CSV URL with columns: Team Name, Player Name, Jersey Number.
            </Text>

            <Text style={styles.inputLabel}>CSV URL</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor={Colors.textTertiary}
                value={csvUrlInput}
                onChangeText={setCsvUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
                testID="csv-url-input"
              />
            </View>

            <View style={styles.csvRecentSection}>
              <Text style={styles.csvRecentLabel}>Quick options</Text>
              <View style={styles.csvRecentChips}>
                {csvLastSuccessfulUrl ? (
                  <TouchableOpacity
                    key={csvLastSuccessfulUrl}
                    style={styles.csvRecentChip}
                    activeOpacity={0.85}
                    onPress={() => setCsvUrlInput(csvLastSuccessfulUrl)}
                    testID="csv-last-successful-url"
                  >
                    <Text style={styles.csvRecentChipText} numberOfLines={1}>
                      {csvLastSuccessfulUrl}
                    </Text>
                    <Text style={styles.csvRecentChipNote} numberOfLines={1}>
                      Last successful URL
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  key={CSV_TEST_AND_EXAMPLE_URL}
                  style={styles.csvRecentChip}
                  activeOpacity={0.85}
                  onPress={() => setCsvUrlInput(CSV_TEST_AND_EXAMPLE_URL)}
                  testID="csv-test-example-url"
                >
                  <Text style={styles.csvRecentChipText} numberOfLines={1}>
                    {CSV_TEST_AND_EXAMPLE_URL}
                  </Text>
                  <Text style={styles.csvRecentChipNote} numberOfLines={1}>
                    Test and example URL
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.csvActions}>
              <TouchableOpacity
                style={styles.confirmBackBtn}
                onPress={closeCsvImport}
                testID="csv-import-cancel"
              >
                <Text style={styles.confirmBackText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmContinueBtn}
                onPress={handleFetchCsv}
                disabled={isCsvLoading}
                testID="csv-import-fetch"
              >
                {isCsvLoading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.confirmContinueText}>Fetch</Text>
                )}
              </TouchableOpacity>
            </View>

            {csvTeams.length > 0 ? (
              <View style={styles.csvTeamSection}>
                <Text style={styles.csvSectionTitle}>Select a team to import</Text>
                <ScrollView style={styles.csvTeamList} showsVerticalScrollIndicator={false}>
                  {csvTeams.map((team) => (
                    <TouchableOpacity
                      key={team}
                      style={styles.csvTeamRow}
                      onPress={() => confirmImportTeam(team)}
                      testID={`csv-team-${team.replace(/[^a-z0-9_-]+/gi, '-')}`}
                    >
                      <View style={styles.csvTeamMeta}>
                        <Text style={styles.csvTeamName}>{team}</Text>
                        <Text style={styles.csvTeamCount}>
                          {(csvRosterByTeam[team]?.length ?? 0).toString()} players
                        </Text>
                      </View>
                      <Text style={styles.csvImportHint}>Import to {activeRosterTab.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

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
    backgroundColor: Colors.success,
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
  csvCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  csvActions: {
    flexDirection: 'row',
    gap: 12,
  },
  csvRecentSection: {
    marginTop: 10,
    marginBottom: 2,
  },
  csvRecentLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  csvRecentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  csvRecentChip: {
    maxWidth: '100%',
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  csvRecentChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark,
    maxWidth: 260,
  },
  csvRecentChipNote: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    maxWidth: 260,
  },
  csvTeamSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: 14,
  },
  csvSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 10,
  },
  csvTeamList: {
    maxHeight: 260,
  },
  csvTeamRow: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  csvTeamMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  csvTeamName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark,
    flex: 1,
  },
  csvTeamCount: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  csvImportHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
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

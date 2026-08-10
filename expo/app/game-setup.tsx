import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import {
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
import SettingsButton from '@/components/SettingsButton';

type CsvRosterRow = { teamName: string; playerName: string; jerseyNumber: string };

const PELIKONE_HISTORY_KEY = 'pointtracker.pelikoneHistory.v1';
const PELIKONE_HISTORY_MAX = 5;
type PelikoneHistoryEntry = { url: string; teamName: string };
const CSV_LAST_SUCCESSFUL_URL_KEY = 'pointtracker.csvLastSuccessfulUrl.v1';
// Back-compat: earlier builds stored an array of recent URLs under this key.
const CSV_URL_HISTORY_KEY = 'pointtracker.csvUrlHistory.v1';
const CSV_TEST_AND_EXAMPLE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQtm2zf2JpJ4saXJXhkMtVf9g73WUFMzt0LgE6fyxd4-mD-2Pca8Z8UAXPasMJwHYYX0joGfTfuRAw_/pub?output=csv';

function findDuplicateJerseyNumbers(players: Player[]): Set<string> {
  const counts = new Map<string, number>();
  players.forEach((player) => {
    const number = player.number.trim();
    if (!number) return;
    counts.set(number, (counts.get(number) ?? 0) + 1);
  });
  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([number]) => number)
  );
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ouml;/g, 'ö')
    .replace(/&auml;/g, 'ä')
    .replace(/&aring;/g, 'å')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Aring;/g, 'Å')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function parsePelikoneHtml(html: string): { teamName: string; players: Array<{ name: string; number: string }> } {
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const teamName = h1Match ? decodeHtmlEntities(h1Match[1].trim()) : 'Pelikone Team';

  // Each player row: <tr><td ...>NUMBER</td><td><a href='?view=playercard...'>NAME</a>
  const rowRegex = /<tr><td[^>]*>(\d+)<\/td><td><a[^>]+\?view=playercard[^'">]*['"][^>]*>([^<]+)<\/a>/gi;
  const seen = new Set<string>();
  const players: Array<{ name: string; number: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(html)) !== null) {
    const number = m[1].trim();
    const name = decodeHtmlEntities(m[2].trim());
    if (name && !seen.has(name)) {
      seen.add(name);
      players.push({ name, number });
    }
  }

  return { teamName, players };
}

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
  const headerHeight = useHeaderHeight();
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
    resetRoster,
    replaceRosterForSide,
  } = useGameSetup();
  const [activeRosterTab, setActiveRosterTab] = useState<TeamSide>('home');
  const [playerNameInput, setPlayerNameInput] = useState<string>('');
  const [playerNumberInput, setPlayerNumberInput] = useState<string>('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const editPlayerCardY = useRef<number>(0);

  const [isCsvImportVisible, setIsCsvImportVisible] = useState<boolean>(false);
  const [csvUrlInput, setCsvUrlInput] = useState<string>('');
  const [csvLastSuccessfulUrl, setCsvLastSuccessfulUrl] = useState<string>('');
  const [isCsvLoading, setIsCsvLoading] = useState<boolean>(false);
  const [csvTeams, setCsvTeams] = useState<string[]>([]);
  const [csvRosterByTeam, setCsvRosterByTeam] = useState<
    Record<string, Array<{ name: string; number: string }>>
  >({});

  const [isPelikoneImportVisible, setIsPelikoneImportVisible] = useState<boolean>(false);
  const [pelikoneUrlInput, setPelikoneUrlInput] = useState<string>('');
  const [pelikoneHistory, setPelikoneHistory] = useState<PelikoneHistoryEntry[]>([]);
  const [isPelikoneLoading, setIsPelikoneLoading] = useState<boolean>(false);
  const [pelikoneResult, setPelikoneResult] = useState<{
    teamName: string;
    players: Array<{ name: string; number: string }>;
  } | null>(null);

  useEffect(() => {
    console.log('GameSetup initial teams', {
      homeTeamName,
      awayTeamName,
      homeCount: homePlayers.length,
      awayCount: awayPlayers.length,
    });
  }, [homeTeamName, awayTeamName, homePlayers.length, awayPlayers.length]);

  useEffect(() => {
    AsyncStorage.getItem(PELIKONE_HISTORY_KEY).then((val) => {
      if (!val) return;
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) setPelikoneHistory(parsed.slice(0, PELIKONE_HISTORY_MAX));
      } catch { /* ignore */ }
    }).catch(() => {});
  }, []);

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

  const duplicateJerseyNumbers = useMemo(
    () => findDuplicateJerseyNumbers(currentPlayers),
    [currentPlayers]
  );

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
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: editPlayerCardY.current, animated: true });
    }, 50);
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

  const handleContinue = () => {
    const hasDuplicates =
      findDuplicateJerseyNumbers(homePlayers).size > 0 ||
      findDuplicateJerseyNumbers(awayPlayers).size > 0;

    if (!hasDuplicates) {
      router.push('/stream-choice' as Href);
      return;
    }

    Alert.alert(
      'Duplicate jersey numbers',
      'Some players share the same jersey number. Continue anyway?',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => router.push('/stream-choice' as Href),
        },
      ]
    );
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

  const closeCsvImport = () => {
    setIsCsvImportVisible(false);
    setIsCsvLoading(false);
    setCsvTeams([]);
    setCsvRosterByTeam({});
  };

  const closePelikoneImport = () => {
    setIsPelikoneImportVisible(false);
    setIsPelikoneLoading(false);
    setPelikoneResult(null);
    setPelikoneUrlInput('');
  };

  const handleFetchPelikone = async () => {
    const url = pelikoneUrlInput.trim();
    if (!url) {
      Alert.alert('Missing URL', 'Paste a Pelikone team card URL to import.');
      return;
    }

    try {
      setIsPelikoneLoading(true);
      setPelikoneResult(null);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const html = await res.text();
      const { teamName, players } = parsePelikoneHtml(html);

      if (players.length === 0) {
        Alert.alert('No players found', 'No players could be extracted from that URL.');
        return;
      }

      const newEntry: PelikoneHistoryEntry = { url, teamName };
      const updatedHistory = [
        newEntry,
        ...pelikoneHistory.filter((e) => e.url !== url),
      ].slice(0, PELIKONE_HISTORY_MAX);
      setPelikoneHistory(updatedHistory);
      void AsyncStorage.setItem(PELIKONE_HISTORY_KEY, JSON.stringify(updatedHistory)).catch(() => {});
      setPelikoneResult({ teamName, players });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Import failed', message);
    } finally {
      setIsPelikoneLoading(false);
    }
  };

  const confirmImportPelikone = () => {
    if (!pelikoneResult) return;
    const { teamName, players } = pelikoneResult;
    const side = activeRosterTab;

    Alert.alert(
      'Import roster?',
      `Import "${teamName}" (${players.length} players) into ${side.toUpperCase()} and replace the current roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'default',
          onPress: () => {
            replaceRosterForSide(side, { teamName, players });
            resetPlayerForm();
            closePelikoneImport();
          },
        },
      ],
    );
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <Stack.Screen
        options={{
          title: 'Game Setup',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.dark,
          headerRight: () => <SettingsButton />,
        }}
      />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
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
                onFocus={() => setActiveRosterTab('home')}
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
                onFocus={() => setActiveRosterTab('away')}
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

        <View
          style={styles.inlinePlayerCard}
          onLayout={(e) => { editPlayerCardY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.inputLabel}>PLAYER NAME</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Player name"
              placeholderTextColor={Colors.textTertiary}
              value={playerNameInput}
              onChangeText={setPlayerNameInput}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
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
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
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

        {currentPlayers.map((player) => {
          const hasDuplicateNumber = duplicateJerseyNumbers.has(player.number.trim());
          return (
          <View
            key={player.id}
            style={[styles.playerRow, hasDuplicateNumber && styles.playerRowDuplicate]}
            testID={hasDuplicateNumber ? `player-row-duplicate-${player.id}` : undefined}
          >
            <View style={[styles.playerNumber, hasDuplicateNumber && styles.playerNumberDuplicate]}>
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
          );
        })}

        <TouchableOpacity
          style={styles.importBtn}
          testID="import-roster-button"
          onPress={() => setIsCsvImportVisible(true)}
        >
          <Upload size={18} color={Colors.textSecondary} />
          <Text style={styles.importText}>IMPORT ROSTER (CSV)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.importBtn, styles.importBtnPelikone]}
          testID="import-pelikone-button"
          onPress={() => setIsPelikoneImportVisible(true)}
        >
          <Upload size={18} color={Colors.textSecondary} />
          <Text style={styles.importText}>IMPORT FROM PELIKONE</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.85}
          onPress={handleContinue}
          testID="start-match-button"
        >
          <Play size={20} color={Colors.white} fill={Colors.white} />
          <Text style={styles.startBtnText}>CONTINUE</Text>
        </TouchableOpacity>
      </View>

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

      <Modal
        visible={isPelikoneImportVisible}
        transparent
        animationType="fade"
        onRequestClose={closePelikoneImport}
      >
        <Pressable style={styles.confirmOverlay} onPress={closePelikoneImport} testID="pelikone-import-overlay">
          <Pressable style={styles.csvCard} onPress={() => {}} testID="pelikone-import-card">
            <Text style={styles.confirmTitle}>Import from Pelikone</Text>
            <Text style={styles.confirmMessage}>
              Paste the team card URL from ultimate.fi/pelikone (e.g. ?view=teamcard&team=…).
            </Text>

            <Text style={styles.inputLabel}>PELIKONE URL</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="https://ultimate.fi/pelikone/?view=teamcard&team=…"
                placeholderTextColor={Colors.textTertiary}
                value={pelikoneUrlInput}
                onChangeText={setPelikoneUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
                testID="pelikone-url-input"
              />
            </View>

            {pelikoneHistory.length > 0 ? (
              <View style={styles.csvRecentSection}>
                <Text style={styles.csvRecentLabel}>Recent teams</Text>
                <View style={styles.csvRecentChips}>
                  {pelikoneHistory.map((entry) => (
                    <TouchableOpacity
                      key={entry.url}
                      style={styles.csvRecentChip}
                      activeOpacity={0.85}
                      onPress={() => setPelikoneUrlInput(entry.url)}
                      testID={`pelikone-history-${entry.url}`}
                    >
                      <Text style={styles.csvRecentChipText} numberOfLines={1}>
                        {entry.teamName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.csvActions}>
              <TouchableOpacity
                style={styles.confirmBackBtn}
                onPress={closePelikoneImport}
                testID="pelikone-import-cancel"
              >
                <Text style={styles.confirmBackText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmContinueBtn}
                onPress={handleFetchPelikone}
                disabled={isPelikoneLoading}
                testID="pelikone-import-fetch"
              >
                {isPelikoneLoading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.confirmContinueText}>Fetch</Text>
                )}
              </TouchableOpacity>
            </View>

            {pelikoneResult ? (
              <View style={styles.csvTeamSection}>
                <Text style={styles.csvSectionTitle}>Found team</Text>
                <TouchableOpacity
                  style={styles.csvTeamRow}
                  onPress={confirmImportPelikone}
                  testID="pelikone-team-result"
                >
                  <View style={styles.csvTeamMeta}>
                    <Text style={styles.csvTeamName}>{pelikoneResult.teamName}</Text>
                    <Text style={styles.csvTeamCount}>
                      {pelikoneResult.players.length.toString()} players
                    </Text>
                  </View>
                  <Text style={styles.csvImportHint}>Import to {activeRosterTab.toUpperCase()}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

    </KeyboardAvoidingView>
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
  playerRowDuplicate: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.danger,
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
  playerNumberDuplicate: {
    backgroundColor: Colors.danger,
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
  importBtnPelikone: {
    marginTop: 10,
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

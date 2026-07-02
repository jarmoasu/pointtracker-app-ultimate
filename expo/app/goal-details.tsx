import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Search, Check, Save, Trash2, Ban, Plus, Timer } from 'lucide-react-native';
import { useHeaderHeight } from '@react-navigation/elements';

import Colors from '@/constants/colors';
import { useGameSetup } from '@/app/game-setup-context';

export default function GoalDetailsScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { side, time, eventId } = useLocalSearchParams<{
    side?: 'home' | 'away';
    time?: string;
    eventId?: string;
  }>();
  const { homeTeam, awayTeam, addGoalEvent, addPlayer, liveEvents, updateGoalEvent, startTimeoutEvent } =
    useGameSetup();
  const [scorerSearch, setScorerSearch] = useState<string>('');
  const [assistSearch, setAssistSearch] = useState<string>('');
  const [selectedScorer, setSelectedScorer] = useState<string | null>(null);
  const [selectedAssist, setSelectedAssist] = useState<string | null>(null);
  const [isNewPlayerVisible, setIsNewPlayerVisible] = useState<boolean>(false);
  const [newPlayerTarget, setNewPlayerTarget] = useState<'scorer' | 'assist' | null>(null);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerNumber, setNewPlayerNumber] = useState<string>('');
  const [editMinutes, setEditMinutes] = useState<string>('');
  const [editSeconds, setEditSeconds] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const scorerSectionY = useRef<number>(0);

  const editingEvent = useMemo(() => {
    if (!eventId) return null;
    return liveEvents.find((event) => event.id === eventId) ?? null;
  }, [eventId, liveEvents]);

  const getTimeParts = useCallback((raw?: string | null) => {
    const trimmed = (raw ?? '').trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return { mm: match[1].padStart(2, '0'), ss: match[2] };
    }

    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 4) return { mm: digits.slice(0, 2), ss: digits.slice(2) };
    if (digits.length === 3) return { mm: digits.slice(0, 1).padStart(2, '0'), ss: digits.slice(1) };
    return { mm: '', ss: '' };
  }, []);

  const scoringSide = editingEvent?.teamId === 'away' || editingEvent?.teamId === 'home'
    ? editingEvent.teamId
    : side ?? 'home';
  const scoringTeam = scoringSide === 'home' ? homeTeam : awayTeam;
  const players = scoringTeam?.players ?? [];

  const trimmedScorerSearch = scorerSearch.trim();
  const trimmedAssistSearch = assistSearch.trim();

  const filteredScorers = useMemo(
    () =>
      players.filter(
        (p) =>
          p.name.toLowerCase().includes(scorerSearch.toLowerCase()) ||
          p.number.includes(scorerSearch),
      ),
    [players, scorerSearch],
  );

  const filteredAssists = useMemo(
    () =>
      players.filter(
        (p) =>
          p.name.toLowerCase().includes(assistSearch.toLowerCase()) ||
          p.number.includes(assistSearch),
      ),
    [players, assistSearch],
  );

  const hasScorerMatch = useMemo(
    () =>
      !!trimmedScorerSearch &&
      players.some(
        (player) =>
          player.name.toLowerCase() === trimmedScorerSearch.toLowerCase() ||
          player.number === trimmedScorerSearch,
      ),
    [players, trimmedScorerSearch],
  );

  const hasAssistMatch = useMemo(
    () =>
      !!trimmedAssistSearch &&
      players.some(
        (player) =>
          player.name.toLowerCase() === trimmedAssistSearch.toLowerCase() ||
          player.number === trimmedAssistSearch,
      ),
    [players, trimmedAssistSearch],
  );

  const scrollToScorer = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: scorerSectionY.current, animated: true });
    }, 50);
  }, []);

  const resetNewPlayerForm = useCallback(() => {
    setIsNewPlayerVisible(false);
    setNewPlayerTarget(null);
    setNewPlayerName('');
    setNewPlayerNumber('');
  }, []);

  const openNewPlayerForm = useCallback(
    (target: 'scorer' | 'assist', seedName: string) => {
      setIsNewPlayerVisible(true);
      setNewPlayerTarget(target);
      setNewPlayerName(seedName);
      setNewPlayerNumber('');
    },
    [],
  );

  const handleAddPlayer = useCallback(() => {
    const trimmedName = newPlayerName.trim();
    const trimmedNumber = newPlayerNumber.trim();

    if (!trimmedName && !trimmedNumber) {
      Alert.alert('Missing details', 'Please enter a player name or jersey number.');
      return;
    }

    const createdPlayer = addPlayer(scoringSide, trimmedName, trimmedNumber);
    console.log('GoalDetails add player', { createdPlayer, scoringSide, newPlayerTarget });

    if (newPlayerTarget === 'assist') {
      setSelectedAssist(createdPlayer.id);
      setAssistSearch('');
      scrollToScorer();
    } else {
      setSelectedScorer(createdPlayer.id);
      setScorerSearch('');
    }

    resetNewPlayerForm();
  }, [addPlayer, newPlayerName, newPlayerNumber, newPlayerTarget, resetNewPlayerForm, scoringSide]);

  const validateSelection = useCallback(() => {
    if (!selectedScorer) {
      console.log('GoalDetails: missing scorer');
      Alert.alert('Select a scorer', 'Please choose a goal scorer before saving.');
      return null;
    }

    const scorer = players.find((player) => player.id === selectedScorer);
    if (!scorer) {
      console.log('GoalDetails: scorer not found', { selectedScorer });
      Alert.alert('Scorer not found', 'Please select a valid scorer.');
      return null;
    }

    if (selectedAssist && selectedAssist !== 'none' && selectedAssist === selectedScorer) {
      console.log('GoalDetails: scorer and assist match', { selectedScorer, selectedAssist });
      Alert.alert('Invalid assist', 'Scorer and assist cannot be the same player.');
      return null;
    }

    const assist =
      selectedAssist && selectedAssist !== 'none'
        ? players.find((player) => player.id === selectedAssist) ?? null
        : null;

    return { scorer, assist };
  }, [players, selectedAssist, selectedScorer]);

  const handleSave = useCallback(() => {
    const selection = validateSelection();
    if (!selection) return;
    const { scorer, assist } = selection;

    const baseGameTime = time ?? editingEvent?.gameTime ?? '--:--';

    const buildEditedTime = () => {
      const mm = editMinutes.trim();
      const ss = editSeconds.trim();
      if (!mm || !ss) return null;
      const minutes = Number(mm);
      const seconds = Number(ss);
      if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
      if (minutes < 0 || minutes > 99) return null;
      if (seconds < 0 || seconds > 59) return null;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    if (editingEvent) {
      const editedTime = buildEditedTime();
      if (!editedTime) {
        Alert.alert('Invalid time', 'Please enter a valid time in MM:SS format.');
        return;
      }
      updateGoalEvent(editingEvent.id, { scorer, assist, gameTime: editedTime });
      console.log('GoalDetails: updated goal event', { editingEvent, scorer, assist });
      router.back();
      return;
    }

    addGoalEvent({ side: scoringSide, scorer, assist, gameTime: baseGameTime });
    console.log('GoalDetails: saved goal event', { scorer, assist, gameTime: baseGameTime, scoringSide });
    router.back();
  }, [
    addGoalEvent,
    editingEvent,
    editMinutes,
    editSeconds,
    router,
    scoringSide,
    time,
    updateGoalEvent,
    validateSelection,
  ]);

  const handleSaveAndStartTimeout = useCallback(() => {
    const selection = validateSelection();
    if (!selection) return;
    const { scorer, assist } = selection;

    const baseGameTime = time ?? '--:--';

    addGoalEvent({ side: scoringSide, scorer, assist, gameTime: baseGameTime });
    startTimeoutEvent({ side: scoringSide, gameTime: baseGameTime });
    console.log('GoalDetails: saved goal and started timeout', {
      scorer,
      assist,
      gameTime: baseGameTime,
      scoringSide,
    });
    router.back();
  }, [addGoalEvent, router, scoringSide, startTimeoutEvent, time, validateSelection]);

  React.useEffect(() => {
    if (!eventId) return;
    if (!editingEvent) {
      Alert.alert('Event not found', 'Unable to load this log item for editing.');
      router.back();
      return;
    }

    const initialTime = getTimeParts(editingEvent.gameTime ?? time ?? '');
    setEditMinutes(initialTime.mm);
    setEditSeconds(initialTime.ss);

    const scorerMatch = players.find(
      (player) =>
        player.number === editingEvent.scorerNumber && player.name === editingEvent.scorerName,
    );
    if (scorerMatch) {
      setSelectedScorer(scorerMatch.id);
    }

    if (editingEvent.assistNumber || editingEvent.assistName) {
      const assistMatch = players.find(
        (player) =>
          player.number === editingEvent.assistNumber && player.name === editingEvent.assistName,
      );
      if (assistMatch) {
        setSelectedAssist(assistMatch.id);
      }
    }
  }, [editingEvent, eventId, getTimeParts, players, router, time]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <Stack.Screen
        options={{
          title: editingEvent ? 'Edit Goal' : 'Goal Details',
          presentation: 'modal',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
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
        <View style={styles.topCards}>
          <View style={styles.teamCard}>
            <Text style={styles.teamCardIcon}>🏁</Text>
            <Text style={styles.teamCardName}>{scoringTeam?.name ?? 'Home team'}</Text>
            <Text style={styles.teamCardLabel}>SCORING TEAM</Text>
          </View>
          <View style={styles.clockCard}>
            <Text style={styles.clockIcon}>⏱</Text>
            {editingEvent ? (
              <View style={styles.clockTimeEditorRow}>
                <TextInput
                  style={styles.clockTimeInput}
                  placeholder="MM"
                  placeholderTextColor={Colors.textTertiary}
                  value={editMinutes}
                  onChangeText={(v) => setEditMinutes(v.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  testID="edit-goal-time-minutes"
                />
                <Text style={styles.clockTimeColon}>:</Text>
                <TextInput
                  style={styles.clockTimeInput}
                  placeholder="SS"
                  placeholderTextColor={Colors.textTertiary}
                  value={editSeconds}
                  onChangeText={(v) => setEditSeconds(v.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  testID="edit-goal-time-seconds"
                />
              </View>
            ) : (
              <Text style={styles.clockTime}>{time ?? '--:--'}</Text>
            )}
            <Text style={styles.clockLabel}>GAME CLOCK</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>🏃 ASSIST</Text>
            <Text style={styles.optionalLabel}>optional</Text>
          </View>
        </View>

        {isNewPlayerVisible && newPlayerTarget === 'assist' ? (
          <View style={styles.newPlayerCard} testID="new-player-form-assist">
            <Text style={styles.newPlayerTitle}>Add New Assist</Text>
            <View style={styles.newPlayerRow}>
              <TextInput
                style={styles.newPlayerInput}
                placeholder="Player name"
                placeholderTextColor={Colors.textTertiary}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                testID="new-player-name-assist"
              />
              <TextInput
                style={styles.newPlayerInput}
                placeholder="#"
                placeholderTextColor={Colors.textTertiary}
                value={newPlayerNumber}
                onChangeText={setNewPlayerNumber}
                keyboardType="number-pad"
                testID="new-player-number-assist"
              />
            </View>
            <View style={styles.newPlayerActions}>
              <TouchableOpacity
                style={styles.newPlayerCancel}
                onPress={resetNewPlayerForm}
                testID="new-player-cancel-assist"
              >
                <Text style={styles.newPlayerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newPlayerSave}
                onPress={handleAddPlayer}
                testID="new-player-save-assist"
              >
                <Text style={styles.newPlayerSaveText}>Add Player</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.searchBox}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search # or Name"
            placeholderTextColor={Colors.textTertiary}
            value={assistSearch}
            onChangeText={setAssistSearch}
            testID="assist-search-input"
          />
        </View>

        {filteredAssists.length > 0 ? (
          filteredAssists.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.playerRow,
                styles.assistPlayerRow,
                selectedAssist === player.id && styles.playerRowSelected,
              ]}
              onPress={() => {
                if (selectedScorer && selectedScorer === player.id) {
                  Alert.alert('Invalid selection', 'Scorer cannot be the same as assist.');
                  return;
                }
                Keyboard.dismiss();
                setSelectedAssist(player.id);
                scrollToScorer();
              }}
              activeOpacity={0.7}
              testID={`assist-${player.id}`}
            >
              <View
                style={[
                  styles.playerNumber,
                  styles.assistPlayerNumber,
                  selectedAssist === player.id && styles.playerNumberSelected,
                ]}
              >
                <Text style={styles.playerNumberText}>{player.number}</Text>
              </View>
              <Text style={styles.playerName}>{player.name}</Text>
              {selectedAssist === player.id && (
                <View style={styles.checkIcon}>
                  <Check size={18} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : null}

        {!isNewPlayerVisible && trimmedAssistSearch.length > 0 && !hasAssistMatch ? (
          <TouchableOpacity
            style={styles.addPlayerPrompt}
            onPress={() => openNewPlayerForm('assist', trimmedAssistSearch)}
            testID="add-assist-prompt"
          >
            <View style={styles.addPlayerPromptIcon}>
              <Plus size={16} color={Colors.white} />
            </View>
            <View style={styles.addPlayerPromptTextWrap}>
              <Text style={styles.addPlayerPromptTitle}>Add new player</Text>
              <Text style={styles.addPlayerPromptText}>{`Add "${trimmedAssistSearch}" to roster`}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.noAssistRow, selectedAssist === 'none' && styles.noAssistRowSelected]}
          onPress={() => {
            Keyboard.dismiss();
            setSelectedAssist('none');
            scrollToScorer();
          }}
          activeOpacity={0.7}
          testID="no-assist-button"
        >
          <Ban size={18} color={selectedAssist === 'none' ? Colors.primaryDark : Colors.textTertiary} />
          <Text
            style={[styles.noAssistText, selectedAssist === 'none' && styles.noAssistTextSelected]}
          >
            No Assist / Callahan
          </Text>
          {selectedAssist === 'none' && (
            <View style={styles.checkIcon}>
              <Check size={18} color={Colors.white} />
            </View>
          )}
        </TouchableOpacity>

        <View
          style={[styles.sectionRow, { marginTop: 24 }]}
          onLayout={(e) => { scorerSectionY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>⚽ GOAL SCORER</Text>
        </View>

        {isNewPlayerVisible && newPlayerTarget === 'scorer' ? (
          <View style={styles.newPlayerCard} testID="new-player-form">
            <Text style={styles.newPlayerTitle}>Add New Scorer</Text>
            <View style={styles.newPlayerRow}>
              <TextInput
                style={styles.newPlayerInput}
                placeholder="Player name"
                placeholderTextColor={Colors.textTertiary}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                testID="new-player-name"
              />
              <TextInput
                style={styles.newPlayerInput}
                placeholder="#"
                placeholderTextColor={Colors.textTertiary}
                value={newPlayerNumber}
                onChangeText={setNewPlayerNumber}
                keyboardType="number-pad"
                testID="new-player-number"
              />
            </View>
            <View style={styles.newPlayerActions}>
              <TouchableOpacity
                style={styles.newPlayerCancel}
                onPress={resetNewPlayerForm}
                testID="new-player-cancel"
              >
                <Text style={styles.newPlayerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newPlayerSave}
                onPress={handleAddPlayer}
                testID="new-player-save"
              >
                <Text style={styles.newPlayerSaveText}>Add Player</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.searchBox}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search # or Name"
            placeholderTextColor={Colors.textTertiary}
            value={scorerSearch}
            onChangeText={setScorerSearch}
            testID="scorer-search-input"
          />
        </View>

        {filteredScorers.length > 0 ? (
          filteredScorers.map((player) => (
            <TouchableOpacity
              key={player.id}
              style={[
                styles.playerRow,
                selectedScorer === player.id && styles.playerRowSelected,
              ]}
              onPress={() => {
                if (selectedAssist && selectedAssist !== 'none' && selectedAssist === player.id) {
                  Alert.alert('Invalid selection', 'Assist cannot be the same as scorer.');
                  return;
                }
                Keyboard.dismiss();
                setSelectedScorer(player.id);
              }}
              activeOpacity={0.7}
              testID={`scorer-${player.id}`}
            >
              <View
                style={[
                  styles.playerNumber,
                  selectedScorer === player.id && styles.playerNumberSelected,
                ]}
              >
                <Text style={styles.playerNumberText}>{player.number}</Text>
              </View>
              <Text
                style={[
                  styles.playerName,
                  selectedScorer === player.id && styles.playerNameSelected,
                ]}
              >
                {player.name}
              </Text>
              {selectedScorer === player.id && (
                <View style={styles.checkIcon}>
                  <Check size={18} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : trimmedScorerSearch.length === 0 ? (
          <View style={styles.emptyRoster} testID="scorer-empty">
            <Text style={styles.emptyTitle}>No roster yet</Text>
            <Text style={styles.emptyText}>Add players in game setup to select a scorer.</Text>
          </View>
        ) : null}

        {!isNewPlayerVisible && trimmedScorerSearch.length > 0 && !hasScorerMatch ? (
          <TouchableOpacity
            style={styles.addPlayerPrompt}
            onPress={() => openNewPlayerForm('scorer', trimmedScorerSearch)}
            testID="add-scorer-prompt"
          >
            <View style={styles.addPlayerPromptIcon}>
              <Plus size={16} color={Colors.white} />
            </View>
            <View style={styles.addPlayerPromptTextWrap}>
              <Text style={styles.addPlayerPromptTitle}>Add new player</Text>
              <Text style={styles.addPlayerPromptText}>{`Add "${trimmedScorerSearch}" to roster`}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          onPress={handleSave}
          testID="save-goal-button"
        >
          <Save size={20} color={Colors.white} />
          <Text style={styles.saveBtnText}>Save Goal</Text>
        </TouchableOpacity>
        {!editingEvent ? (
          <TouchableOpacity
            style={styles.saveTimeoutBtn}
            activeOpacity={0.85}
            onPress={handleSaveAndStartTimeout}
            testID="save-goal-timeout-button"
          >
            <Timer size={20} color={Colors.white} />
            <Text style={styles.saveTimeoutBtnText}>Save Goal & Start Timeout</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.discardBtn}
          onPress={() => router.back()}
          testID="discard-button"
        >
          <Trash2 size={16} color={Colors.danger} />
          <Text style={styles.discardText}>Discard Event</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 16,
    paddingBottom: 160,
  },
  topCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  teamCard: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  teamCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  teamCardName: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  teamCardLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  clockCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  clockIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  clockTime: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.dark,
  },
  clockTimeEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clockTimeInput: {
    width: 56,
    backgroundColor: Colors.gray100,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.dark,
    textAlign: 'center',
  },
  clockTimeColon: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.dark,
    marginTop: -1,
  },
  clockLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark,
    letterSpacing: 0.5,
  },
  optionalLabel: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  createNew: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  addPlayerPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 16,
  },
  addPlayerPromptIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlayerPromptTextWrap: {
    flex: 1,
  },
  addPlayerPromptTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 2,
  },
  addPlayerPromptText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  newPlayerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 16,
  },
  newPlayerTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 12,
  },
  newPlayerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  newPlayerInput: {
    flex: 1,
    backgroundColor: Colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  newPlayerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  newPlayerCancel: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  newPlayerCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  newPlayerSave: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  newPlayerSaveText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playerRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  assistPlayerRow: {
    backgroundColor: Colors.gray100,
  },
  playerNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  playerNumberSelected: {
    backgroundColor: Colors.primaryDark,
  },
  assistPlayerNumber: {
    backgroundColor: Colors.gray400,
  },
  playerNumberText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.dark,
    flex: 1,
  },
  emptyRoster: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 16,
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
  playerNameSelected: {
    fontWeight: '600' as const,
    color: Colors.primaryDark,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAssistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.gray300,
    borderRadius: 14,
    marginTop: 4,
  },
  noAssistRowSelected: {
    borderStyle: 'solid',
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  noAssistText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  noAssistTextSelected: {
    fontWeight: '600' as const,
    color: Colors.primaryDark,
  },
  bottomSpacer: {
    height: 40,
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
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    marginBottom: 10,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  saveTimeoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.warning,
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    marginBottom: 10,
  },
  saveTimeoutBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  discardText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.danger,
  },
});

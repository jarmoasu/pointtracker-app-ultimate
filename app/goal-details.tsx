import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Search, Check, Save, Trash2, Ban } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { useGameSetup } from '@/app/game-setup-context';

export default function GoalDetailsScreen() {
  const router = useRouter();
  const { homeTeam } = useGameSetup();
  const [scorerSearch, setScorerSearch] = useState<string>('');
  const [assistSearch, setAssistSearch] = useState<string>('');
  const [selectedScorer, setSelectedScorer] = useState<string | null>(null);
  const [selectedAssist, setSelectedAssist] = useState<string | null>(null);

  const scoringTeam = homeTeam;
  const players = scoringTeam?.players ?? [];

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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Goal Details',
          presentation: 'modal',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topCards}>
          <View style={styles.teamCard}>
            <Text style={styles.teamCardIcon}>🏁</Text>
            <Text style={styles.teamCardName}>{scoringTeam?.name ?? 'Home team'}</Text>
            <Text style={styles.teamCardLabel}>SCORING TEAM</Text>
          </View>
          <View style={styles.clockCard}>
            <Text style={styles.clockIcon}>⏱</Text>
            <Text style={styles.clockTime}>--:--</Text>
            <Text style={styles.clockLabel}>GAME CLOCK</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>⚽ GOAL SCORER</Text>
          <TouchableOpacity>
            <Text style={styles.createNew}>Create New</Text>
          </TouchableOpacity>
        </View>

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
              onPress={() => setSelectedScorer(player.id)}
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
        ) : (
          <View style={styles.emptyRoster} testID="scorer-empty">
            <Text style={styles.emptyTitle}>No roster yet</Text>
            <Text style={styles.emptyText}>Add players in game setup to select a scorer.</Text>
          </View>
        )}

        <View style={[styles.sectionRow, { marginTop: 24 }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>🏃 ASSIST</Text>
            <Text style={styles.optionalLabel}>optional</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.createNew}>Create New</Text>
          </TouchableOpacity>
        </View>

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
              onPress={() => setSelectedAssist(player.id)}
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

        <TouchableOpacity
          style={styles.noAssistRow}
          onPress={() => setSelectedAssist('none')}
          activeOpacity={0.7}
          testID="no-assist-button"
        >
          <Ban size={18} color={Colors.textTertiary} />
          <Text style={styles.noAssistText}>No Assist / Callahan</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.85}
          onPress={() => router.back()}
          testID="save-goal-button"
        >
          <Save size={20} color={Colors.white} />
          <Text style={styles.saveBtnText}>Save Goal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.discardBtn}
          onPress={() => router.back()}
          testID="discard-button"
        >
          <Trash2 size={16} color={Colors.textSecondary} />
          <Text style={styles.discardText}>Discard Event</Text>
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
  noAssistText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Pencil, X, UserPlus, Search } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { mockTeams } from '@/mocks/games';
import { Team, Player } from '@/types/game';

function PlayerRow({ player }: { player: Player }) {
  return (
    <View style={styles.playerRow} testID="player-row">
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
  );
}

function TeamCard({ team }: { team: Team }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.teamCard} testID="team-card">
      <TouchableOpacity
        style={styles.teamCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.teamInfo}>
          <View style={[styles.teamDot, { backgroundColor: team.color }]} />
          <View>
            <Text style={styles.teamName}>{team.name}</Text>
            <Text style={styles.teamPlayerCount}>
              {team.players.length} players
            </Text>
          </View>
        </View>
        <View style={styles.teamAbbrev}>
          <Text style={styles.teamAbbrevText}>{team.abbreviation}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.teamExpanded}>
          {team.players.length > 0 ? (
            team.players.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))
          ) : (
            <Text style={styles.noPlayersText}>No players added yet</Text>
          )}
          <TouchableOpacity style={styles.addPlayerBtn} testID="add-player-button">
            <UserPlus size={18} color={Colors.primary} />
            <Text style={styles.addPlayerText}>Add Player</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function TeamsScreen() {
  const [search, setSearch] = useState('');
  const filteredTeams = mockTeams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity style={styles.addTeamHeaderBtn} testID="add-team-button">
              <Plus size={20} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.searchContainer}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          testID="search-teams-input"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredTeams.map((team) => (
          <TeamCard key={team.id} team={team} />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  addTeamHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark,
  },
  teamCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  teamDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.dark,
  },
  teamPlayerCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  teamAbbrev: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  teamAbbrevText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  teamExpanded: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
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
  noPlayersText: {
    fontSize: 14,
    color: Colors.textTertiary,
    paddingVertical: 16,
    textAlign: 'center',
  },
  addPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    borderRadius: 12,
  },
  addPlayerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});

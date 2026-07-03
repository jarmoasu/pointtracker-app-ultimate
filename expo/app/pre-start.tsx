import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Play, AlertCircle } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { useGameSetup } from '@/app/game-setup-context';
import SettingsButton from '@/components/SettingsButton';

const DEFAULT_BACKEND_BASE_URL = 'https://pointtracker-service-ultimate.onrender.com';

export default function PreStartScreen() {
  const router = useRouter();
  const { backendBaseUrl, writeToken, streamId, deviceName, homeTeam, awayTeam, resetLiveGame } =
    useGameSetup();

  const syncTeamsToBackend = async () => {
    const token = writeToken.trim();
    const currentStreamId = streamId.trim();
    if (!token || !currentStreamId) return;

    const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, '');
    const trimmedDeviceName = deviceName.trim();
    const payload = { homeTeamName: homeTeam.name, awayTeamName: awayTeam.name };

    try {
      const res = await fetch(`${normalizedBaseUrl}/streams/${encodeURIComponent(currentStreamId)}/teams`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Write-Token': token,
          ...(trimmedDeviceName ? { 'X-Device-Name': trimmedDeviceName } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const raw = await res.text();
          try {
            const errorPayload = JSON.parse(raw);
            if (typeof errorPayload?.message === 'string') message = errorPayload.message;
            if (typeof errorPayload?.error === 'string') message = errorPayload.error;
          } catch {
            const trimmed = raw.trim();
            if (trimmed) message = trimmed;
          }
        } catch { /* ignore */ }
        throw new Error(message);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.log('Teams sync failed', { message, payload });
    }
  };

  const syncClockStartToBackend = async () => {
    const token = writeToken.trim();
    const currentStreamId = streamId.trim();
    if (!token || !currentStreamId) return;

    const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, '');
    const trimmedDeviceName = deviceName.trim();
    const payload = { gameClockSeconds: 0, running: true };

    try {
      const res = await fetch(`${normalizedBaseUrl}/streams/${encodeURIComponent(currentStreamId)}/clock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Write-Token': token,
          ...(trimmedDeviceName ? { 'X-Device-Name': trimmedDeviceName } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const raw = await res.text();
          try {
            const errorPayload = JSON.parse(raw);
            if (typeof errorPayload?.message === 'string') message = errorPayload.message;
            if (typeof errorPayload?.error === 'string') message = errorPayload.error;
          } catch {
            const trimmed = raw.trim();
            if (trimmed) message = trimmed;
          }
        } catch { /* ignore */ }
        throw new Error(message);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.log('Clock start sync failed', { message, payload });
    }
  };

  const handleStartGame = () => {
    void syncTeamsToBackend();
    void syncClockStartToBackend();
    resetLiveGame();
    router.push('/live-scoring' as Href);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Start Game',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.dark,
          headerRight: () => <SettingsButton />,
        }}
      />

      <View style={styles.content}>
        <View style={styles.noticeCard}>
          <AlertCircle size={28} color={Colors.warning} style={styles.noticeIcon} />
          <Text style={styles.noticeTitle}>When to start</Text>
          <Text style={styles.noticeBody}>
            Press "Start Game" when the actual game clock starts — not before. The in-app clock
            begins immediately when you press the button.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.85}
          onPress={handleStartGame}
          testID="pre-start-start-button"
        >
          <Play size={22} color={Colors.white} fill={Colors.white} />
          <Text style={styles.startBtnText}>START GAME</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  noticeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: 'center',
  },
  noticeIcon: {
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  noticeBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 23,
    textAlign: 'center',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.success,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 24,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 1,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Share,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import * as Clipboard from 'expo-clipboard';
import { Wifi, KeyRound, Copy, Check, Share2 } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { useGameSetup } from '@/app/game-setup-context';

const DEFAULT_BACKEND_BASE_URL = 'https://pointtracker-service-ultimate.onrender.com';

type StreamLiveState = {
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
};

export default function StreamSetupScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { backendBaseUrl, streamId, deviceName, setBackendBaseUrl, setWriteToken, setStreamId, setDeviceName } =
    useGameSetup();

  const [claimCode, setClaimCode] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [connectedState, setConnectedState] = useState<StreamLiveState | null>(null);
  const [isConnectedStateLoading, setIsConnectedStateLoading] = useState<boolean>(false);
  const [justCopied, setJustCopied] = useState<boolean>(false);

  const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, '');
  const scoreboardUrl = streamId
    ? `${normalizedBaseUrl}/scoreboard.html?stream=${encodeURIComponent(streamId)}`
    : '';

  const handleCopyScoreboardLink = async () => {
    if (!scoreboardUrl) return;
    await Clipboard.setStringAsync(scoreboardUrl);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  const handleShareScoreboardLink = async () => {
    if (!scoreboardUrl) return;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url: scoreboardUrl, message: scoreboardUrl }
          : { message: scoreboardUrl },
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Share failed', message);
    }
  };

  const fetchConnectedStreamInfo = async (targetStreamId: string) => {
    if (!targetStreamId) {
      setConnectedState(null);
      return;
    }
    const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, '');
    try {
      setIsConnectedStateLoading(true);
      const res = await fetch(`${normalizedBaseUrl}/streams/${encodeURIComponent(targetStreamId)}/live`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const payload = (await res.json()) as StreamLiveState;
      setConnectedState(payload);
    } catch {
      setConnectedState(null);
    } finally {
      setIsConnectedStateLoading(false);
    }
  };

  useEffect(() => {
    void fetchConnectedStreamInfo(streamId);
  }, [backendBaseUrl, streamId]);

  const handleClaimStream = async () => {
    const trimmedClaimCode = claimCode.trim();
    if (!trimmedClaimCode) {
      Alert.alert('Missing claim code', 'Please enter a claim code.');
      return;
    }
    const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, '');
    const trimmedDeviceName = deviceName.trim();
    if (!trimmedDeviceName) {
      Alert.alert('Missing device name', 'Please enter a device name.');
      return;
    }

    try {
      setIsClaiming(true);
      const res = await fetch(`${normalizedBaseUrl}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCode: trimmedClaimCode, deviceName: trimmedDeviceName }),
      });

      let payload: any = null;
      try { payload = await res.json(); } catch { payload = null; }

      if (!res.ok) {
        const message =
          typeof payload?.message === 'string' ? payload.message :
          typeof payload?.error === 'string' ? payload.error :
          `Request failed (${res.status})`;
        throw new Error(message);
      }

      const nextWriteToken = typeof payload?.writeToken === 'string' ? payload.writeToken.trim() : '';
      const nextStreamId = typeof payload?.streamId === 'string' ? payload.streamId.trim() : '';
      if (!nextWriteToken || !nextStreamId) throw new Error('No writeToken/streamId returned from server.');

      setWriteToken(nextWriteToken);
      setStreamId(nextStreamId);
      setClaimCode('');
      void fetchConnectedStreamInfo(nextStreamId);
      Alert.alert('Stream claimed', `Connected to court "${nextStreamId}".`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Claim failed', message);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <Stack.Screen
        options={{
          title: 'Stream Connection',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.dark,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.streamCard}>
          <Text style={styles.inputLabel}>SERVICE URL</Text>
          <View style={styles.inputRow}>
            <Wifi size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder={DEFAULT_BACKEND_BASE_URL}
              placeholderTextColor={Colors.textTertiary}
              value={backendBaseUrl}
              onChangeText={setBackendBaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              testID="backend-url-input"
            />
          </View>

          <Text style={styles.inputLabel}>YOUR (NICK) NAME</Text>
          <View style={styles.inputRow}>
            <Wifi size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex"
              placeholderTextColor={Colors.textTertiary}
              value={deviceName}
              onChangeText={setDeviceName}
              autoCapitalize="none"
              autoCorrect={false}
              testID="device-name-input"
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
          <Text style={styles.claimCodeHint}>Testing? Use claim code 12345678</Text>

          <TouchableOpacity
            style={[styles.claimStreamButton, isClaiming ? styles.claimStreamButtonDisabled : null]}
            activeOpacity={0.85}
            onPress={handleClaimStream}
            disabled={isClaiming}
            testID="claim-stream-button"
          >
            {isClaiming ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.claimStreamText}>CLAIM STREAM</Text>
            )}
          </TouchableOpacity>

          <View style={styles.streamReservationInfo}>
            {isConnectedStateLoading ? (
              <Text style={styles.streamReservationText}>Checking connection…</Text>
            ) : streamId && connectedState ? (
              <>
                <Text style={styles.streamReservationText}>
                  Court: <Text style={styles.streamReservationValue}>{streamId}</Text>
                </Text>
                <Text style={styles.streamReservationText}>
                  Teams:{' '}
                  <Text style={styles.streamReservationValue}>
                    {connectedState.homeTeamName || 'Home'} {connectedState.homeScore ?? 0} - {connectedState.awayScore ?? 0} {connectedState.awayTeamName || 'Away'}
                  </Text>
                </Text>
              </>
            ) : streamId ? (
              <Text style={styles.streamReservationText}>Connected to court "{streamId}", but couldn't load its state.</Text>
            ) : (
              <Text style={styles.streamReservationText}>Not connected to a court yet — enter a claim code above.</Text>
            )}
          </View>

          {streamId ? (
            <View style={styles.scoreboardLinkCard}>
              <Text style={styles.inputLabel}>SCOREBOARD LINK</Text>
              <Text style={styles.scoreboardLinkUrl} numberOfLines={1} ellipsizeMode="middle">
                {scoreboardUrl}
              </Text>
              <View style={styles.scoreboardLinkActions}>
                <TouchableOpacity
                  style={styles.scoreboardLinkButton}
                  activeOpacity={0.85}
                  onPress={handleCopyScoreboardLink}
                  testID="copy-scoreboard-link-button"
                >
                  {justCopied ? (
                    <Check size={16} color={Colors.dark} />
                  ) : (
                    <Copy size={16} color={Colors.dark} />
                  )}
                  <Text style={styles.scoreboardLinkButtonText}>
                    {justCopied ? 'Copied' : 'Copy Link'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scoreboardLinkButton}
                  activeOpacity={0.85}
                  onPress={handleShareScoreboardLink}
                  testID="share-scoreboard-link-button"
                >
                  <Share2 size={16} color={Colors.dark} />
                  <Text style={styles.scoreboardLinkButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/pre-start' as Href)}
          testID="stream-setup-continue"
        >
          <Text style={styles.continueBtnText}>CONTINUE</Text>
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
    paddingTop: 20,
    paddingBottom: 100,
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
  claimCodeHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: -8,
    marginBottom: 16,
  },
  claimStreamButton: {
    backgroundColor: Colors.dark,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  claimStreamButtonDisabled: {
    opacity: 0.7,
  },
  claimStreamText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.8,
  },
  streamReservationInfo: {
    marginTop: 12,
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  streamReservationText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  streamReservationValue: {
    color: Colors.dark,
    fontWeight: '700' as const,
  },
  scoreboardLinkCard: {
    marginTop: 16,
  },
  scoreboardLinkUrl: {
    fontSize: 13,
    color: Colors.dark,
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  scoreboardLinkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreboardLinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingVertical: 12,
  },
  scoreboardLinkButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.dark,
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
  continueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 1,
  },
});

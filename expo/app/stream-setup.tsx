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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { Wifi, KeyRound } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { useGameSetup } from '@/app/game-setup-context';

const DEFAULT_BACKEND_BASE_URL = 'https://pointtracker-service-ultimate.onrender.com';

type StreamAdminState = {
  writer?: {
    activeWriterName?: string | null;
    claimedAt?: string | null;
  } | null;
};

export default function StreamSetupScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { backendBaseUrl, deviceName, setBackendBaseUrl, setWriteToken, setDeviceName } =
    useGameSetup();

  const [claimCode, setClaimCode] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [activeWriterName, setActiveWriterName] = useState<string>('');
  const [claimedAtIso, setClaimedAtIso] = useState<string>('');
  const [isAdminStateLoading, setIsAdminStateLoading] = useState<boolean>(false);

  const fetchStreamReservationInfo = async () => {
    const normalizedBaseUrl = (backendBaseUrl.trim() || DEFAULT_BACKEND_BASE_URL).replace(/\/+$/, '');
    try {
      setIsAdminStateLoading(true);
      const res = await fetch(`${normalizedBaseUrl}/admin/state`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const payload = (await res.json()) as StreamAdminState;
      setActiveWriterName(payload?.writer?.activeWriterName?.trim() ?? '');
      setClaimedAtIso(payload?.writer?.claimedAt?.trim() ?? '');
    } catch {
      setActiveWriterName('');
      setClaimedAtIso('');
    } finally {
      setIsAdminStateLoading(false);
    }
  };

  useEffect(() => {
    void fetchStreamReservationInfo();
  }, [backendBaseUrl]);

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
      if (!nextWriteToken) throw new Error('No writeToken returned from server.');

      setWriteToken(nextWriteToken);
      setClaimCode('');
      void fetchStreamReservationInfo();
      Alert.alert('Stream claimed', 'Write token saved on this device.');
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
            {isAdminStateLoading ? (
              <Text style={styles.streamReservationText}>Checking stream reservation…</Text>
            ) : activeWriterName ? (
              <>
                <Text style={styles.streamReservationText}>
                  Reserved by: <Text style={styles.streamReservationValue}>{activeWriterName}</Text>
                </Text>
                {claimedAtIso ? (
                  <Text style={styles.streamReservationText}>
                    Claimed at:{' '}
                    <Text style={styles.streamReservationValue}>
                      {new Date(claimedAtIso).toLocaleString()}
                    </Text>
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.streamReservationText}>No active stream reservation info.</Text>
            )}
          </View>
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

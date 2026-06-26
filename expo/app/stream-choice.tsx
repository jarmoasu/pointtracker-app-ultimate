import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Wifi, Smartphone } from 'lucide-react-native';

import Colors from '@/constants/colors';

export default function StreamChoiceScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Game Mode',
          headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.dark,
        }}
      />
      <View style={styles.content}>
        <Text style={styles.heading}>How will you use this game?</Text>
        <Text style={styles.subheading}>
          Choose whether to send live scores to a stream or just track the game locally.
        </Text>

        <TouchableOpacity
          style={styles.optionCard}
          activeOpacity={0.85}
          onPress={() => router.push('/stream-setup' as Href)}
          testID="stream-choice-stream"
        >
          <View style={[styles.optionIcon, styles.optionIconStream]}>
            <Wifi size={28} color={Colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Send to stream</Text>
            <Text style={styles.optionDescription}>
              Connect to the pointtracker service and send live scores to a stream overlay.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          activeOpacity={0.85}
          onPress={() => router.push('/pre-start' as Href)}
          testID="stream-choice-local"
        >
          <View style={[styles.optionIcon, styles.optionIconLocal]}>
            <Smartphone size={28} color={Colors.textSecondary} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Score keeping only</Text>
            <Text style={styles.optionDescription}>
              Track scores locally on this device without connecting to a stream.
            </Text>
          </View>
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
    paddingTop: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconStream: {
    backgroundColor: Colors.primaryFaded,
  },
  optionIconLocal: {
    backgroundColor: Colors.gray100,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});

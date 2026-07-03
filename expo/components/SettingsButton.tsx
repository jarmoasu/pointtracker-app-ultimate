import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Settings } from 'lucide-react-native';

import Colors from '@/constants/colors';

export default function SettingsButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/settings' as Href)}
      style={styles.button}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID="settings-button"
    >
      <Settings size={22} color={Colors.dark} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 6,
    marginRight: 6,
  },
});

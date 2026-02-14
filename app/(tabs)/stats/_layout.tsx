import { Stack } from 'expo-router';
import React from 'react';

import Colors from '@/constants/colors';

export default function StatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '700' as const, color: Colors.dark },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Game History' }}
      />
    </Stack>
  );
}

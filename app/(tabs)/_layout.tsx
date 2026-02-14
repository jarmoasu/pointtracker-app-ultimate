import { Tabs } from 'expo-router';
import { Home, BarChart3, Users } from 'lucide-react-native';
import React from 'react';
import { Platform } from 'react-native';

import Colors from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.gray200,
          borderTopWidth: 1,
          ...(Platform.OS === 'web' ? { height: 60 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'STATS',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'TEAMS',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";

import { GameSetupProvider, useGameSetup } from "./game-setup-context";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function GameKeepAwake() {
  const pathname = usePathname();
  const { isGameEnded } = useGameSetup();

  const isInLiveGameFlow =
    pathname === "/live-scoring" || pathname === "/goal-details" || pathname === "/game-log";
  const shouldKeepAwake = isInLiveGameFlow && !isGameEnded;
  const tag = "pointtracker-live-game";

  useEffect(() => {
    if (shouldKeepAwake) {
      activateKeepAwake(tag);
      return () => deactivateKeepAwake(tag);
    }
    return undefined;
  }, [shouldKeepAwake]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        // Disable swipe-based navigation (iOS edge-swipe back, etc.).
        // Navigation should only happen via explicit app buttons.
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="game-history"
        options={{
          title: "Game History",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="game-setup"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="live-scoring"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="game-log"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="goal-details"
        options={{
          presentation: "modal",
          headerShown: true,
          // Also disable modal swipe-to-dismiss gestures.
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <GameSetupProvider>
          <GameKeepAwake />
          <RootLayoutNav />
        </GameSetupProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

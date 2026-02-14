import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";


SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
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
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

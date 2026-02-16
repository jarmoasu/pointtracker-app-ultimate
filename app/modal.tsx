import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";

import Colors from "@/constants/colors";

export default function ModalScreen() {
  return (
    <View style={styles.container} testID="modal-screen">
      <Stack.Screen options={{ title: "Modal" }} />
      <View style={styles.card}>
        <Text style={styles.title}>Modal</Text>
        <Text style={styles.subtitle}>This screen is ready for future content.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});

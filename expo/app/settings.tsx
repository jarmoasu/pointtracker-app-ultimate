import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Stack } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { Power } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { useSettings } from '@/app/settings-context';
import { CalloutSetting } from '@/types/settings';

function CalloutGroupCard({
  testIDPrefix,
  title,
  description,
  enabled,
  callouts,
  onToggleGroup,
  onUpdateCallout,
}: {
  testIDPrefix: string;
  title: string;
  description: string;
  enabled: boolean;
  callouts: CalloutSetting[];
  onToggleGroup: (enabled: boolean) => void;
  onUpdateCallout: (id: string, updates: Partial<Pick<CalloutSetting, 'seconds' | 'text' | 'enabled'>>) => void;
}) {
  return (
    <View style={styles.groupCard} testID={`settings-group-${testIDPrefix}`}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Switch
          value={enabled}
          onValueChange={onToggleGroup}
          trackColor={{ false: Colors.gray300, true: Colors.primary }}
          testID={`${testIDPrefix}-group-toggle`}
        />
      </View>
      <Text style={styles.groupDescription}>{description}</Text>

      {callouts.map((callout, index) => (
        <View
          key={callout.id}
          style={[styles.calloutRow, !enabled && styles.calloutRowDisabled]}
          testID={`${testIDPrefix}-callout-${index}`}
        >
          <Switch
            value={callout.enabled}
            onValueChange={(value) => onUpdateCallout(callout.id, { enabled: value })}
            disabled={!enabled}
            trackColor={{ false: Colors.gray300, true: Colors.primary }}
            testID={`${testIDPrefix}-callout-toggle-${index}`}
          />
          <View style={styles.secondsInputWrap}>
            <TextInput
              style={styles.secondsInput}
              value={String(callout.seconds)}
              onChangeText={(text) => {
                const digitsOnly = text.replace(/[^0-9]/g, '');
                onUpdateCallout(callout.id, { seconds: Number(digitsOnly) || 0 });
              }}
              keyboardType="number-pad"
              editable={enabled}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              testID={`${testIDPrefix}-seconds-${index}`}
            />
            <Text style={styles.secondsLabel}>sec</Text>
          </View>
          <TextInput
            style={styles.calloutTextInput}
            value={callout.text}
            onChangeText={(text) => onUpdateCallout(callout.id, { text })}
            placeholder="Call to announce"
            placeholderTextColor={Colors.textTertiary}
            editable={enabled}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            testID={`${testIDPrefix}-text-${index}`}
          />
        </View>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const {
    timeBetweenPointsEnabled,
    timeBetweenPointsCallouts,
    setTimeBetweenPointsEnabled,
    updateTimeBetweenPointsCallout,
    timeoutEnabled,
    timeoutCallouts,
    setTimeoutEnabled,
    updateTimeoutCallout,
    timeoutBetweenPointsEnabled,
    timeoutBetweenPointsCallouts,
    setTimeoutBetweenPointsEnabled,
    updateTimeoutBetweenPointsCallout,
    halftimeEnabled,
    halftimeCallouts,
    setHalftimeEnabled,
    updateHalftimeCallout,
  } = useSettings();

  const allGroupsEnabled =
    timeBetweenPointsEnabled && timeoutEnabled && timeoutBetweenPointsEnabled && halftimeEnabled;

  const handleToggleAll = () => {
    const nextEnabled = !allGroupsEnabled;
    setTimeBetweenPointsEnabled(nextEnabled);
    setTimeoutEnabled(nextEnabled);
    setTimeoutBetweenPointsEnabled(nextEnabled);
    setHalftimeEnabled(nextEnabled);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <Stack.Screen
        options={{
          title: 'Settings',
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
      >
        <TouchableOpacity
          style={[styles.toggleAllBtn, allGroupsEnabled && styles.toggleAllBtnActive]}
          activeOpacity={0.85}
          onPress={handleToggleAll}
          testID="toggle-all-settings-button"
        >
          <Power size={20} color={Colors.white} />
          <Text style={styles.toggleAllBtnText}>
            {allGroupsEnabled ? 'TURN ALL CALLOUTS OFF' : 'TURN ALL CALLOUTS ON'}
          </Text>
        </TouchableOpacity>

        <CalloutGroupCard
          testIDPrefix="time-between-points"
          title="Time between points"
          description="Prompts the marker with the correct call once a set amount of time has passed since the last point."
          enabled={timeBetweenPointsEnabled}
          callouts={timeBetweenPointsCallouts}
          onToggleGroup={setTimeBetweenPointsEnabled}
          onUpdateCallout={updateTimeBetweenPointsCallout}
        />

        <CalloutGroupCard
          testIDPrefix="timeout"
          title="Timeout"
          description="Prompts the marker with the correct call once a set amount of time has passed since a timeout started."
          enabled={timeoutEnabled}
          callouts={timeoutCallouts}
          onToggleGroup={setTimeoutEnabled}
          onUpdateCallout={updateTimeoutCallout}
        />

        <CalloutGroupCard
          testIDPrefix="timeout-between-points"
          title="Timeout between points"
          description="Special rule: overrides the regular timeout prompts above when the timeout is taken between points, before the next point has started."
          enabled={timeoutBetweenPointsEnabled}
          callouts={timeoutBetweenPointsCallouts}
          onToggleGroup={setTimeoutBetweenPointsEnabled}
          onUpdateCallout={updateTimeoutBetweenPointsCallout}
        />

        <CalloutGroupCard
          testIDPrefix="halftime"
          title="Halftime"
          description="Prompts the marker as halftime runs out. The highest enabled time also sets the halftime length — once reached, halftime ends automatically and the last call stays up for 5 seconds."
          enabled={halftimeEnabled}
          callouts={halftimeCallouts}
          onToggleGroup={setHalftimeEnabled}
          onUpdateCallout={updateHalftimeCallout}
        />
      </ScrollView>
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
    paddingBottom: 40,
  },
  toggleAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.success,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  toggleAllBtnActive: {
    backgroundColor: Colors.danger,
  },
  toggleAllBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.white,
    letterSpacing: 0.8,
  },
  groupCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.dark,
  },
  groupDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  calloutRowDisabled: {
    opacity: 0.5,
  },
  secondsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  secondsInput: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark,
    minWidth: 28,
    textAlign: 'right',
  },
  secondsLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  calloutTextInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark,
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

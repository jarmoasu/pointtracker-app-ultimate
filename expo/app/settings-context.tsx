import { useCallback, useEffect, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CalloutSetting } from '@/types/settings';

const TIME_BETWEEN_POINTS_KEY = 'pointtracker.settings.timeBetweenPoints.v1';
const TIMEOUT_KEY = 'pointtracker.settings.timeout.v1';
const TIMEOUT_BETWEEN_POINTS_KEY = 'pointtracker.settings.timeoutBetweenPoints.v1';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_TIME_BETWEEN_POINTS_CALLOUTS: CalloutSetting[] = [
  { id: createId(), seconds: 30, text: 'Offense 15!', enabled: true },
  { id: createId(), seconds: 55, text: 'Defense 15!', enabled: true },
  { id: createId(), seconds: 60, text: 'Play!', enabled: true },
];

const DEFAULT_TIMEOUT_CALLOUTS: CalloutSetting[] = [
  { id: createId(), seconds: 30, text: 'Timeout 30 seconds!', enabled: true },
  { id: createId(), seconds: 45, text: 'Offense 15!', enabled: true },
  { id: createId(), seconds: 60, text: 'Defense 15!', enabled: true },
  { id: createId(), seconds: 75, text: 'Timeout over!', enabled: true },
];

const DEFAULT_TIMEOUT_BETWEEN_POINTS_CALLOUTS: CalloutSetting[] = [
  { id: createId(), seconds: 60, text: 'Timeout ended - time between points!', enabled: true },
];

type CalloutGroupSettings = {
  enabled: boolean;
  callouts: CalloutSetting[];
};

function useCalloutGroup(storageKey: string, defaults: CalloutSetting[]) {
  const [enabled, setEnabledState] = useState<boolean>(false);
  const [callouts, setCallouts] = useState<CalloutSetting[]>(defaults);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!isMounted || !raw) return;
        try {
          const parsed = JSON.parse(raw) as CalloutGroupSettings;
          if (typeof parsed.enabled === 'boolean') {
            setEnabledState(parsed.enabled);
          }
          if (Array.isArray(parsed.callouts)) {
            setCallouts(parsed.callouts);
          }
        } catch {
          // ignore malformed settings
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = useCallback(
    (nextEnabled: boolean, nextCallouts: CalloutSetting[]) => {
      void AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ enabled: nextEnabled, callouts: nextCallouts }),
      );
    },
    [storageKey],
  );

  const setEnabled = useCallback(
    (nextEnabled: boolean) => {
      setEnabledState(nextEnabled);
      persist(nextEnabled, callouts);
    },
    [persist, callouts],
  );

  const updateCallout = useCallback(
    (id: string, updates: Partial<Pick<CalloutSetting, 'seconds' | 'text' | 'enabled'>>) => {
      setCallouts((prev) => {
        const next = prev.map((callout) =>
          callout.id === id ? { ...callout, ...updates } : callout,
        );
        persist(enabled, next);
        return next;
      });
    },
    [persist, enabled],
  );

  return { enabled, callouts, setEnabled, updateCallout };
}

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const timeBetweenPoints = useCalloutGroup(
    TIME_BETWEEN_POINTS_KEY,
    DEFAULT_TIME_BETWEEN_POINTS_CALLOUTS,
  );
  const timeout = useCalloutGroup(TIMEOUT_KEY, DEFAULT_TIMEOUT_CALLOUTS);
  const timeoutBetweenPoints = useCalloutGroup(
    TIMEOUT_BETWEEN_POINTS_KEY,
    DEFAULT_TIMEOUT_BETWEEN_POINTS_CALLOUTS,
  );

  return {
    timeBetweenPointsEnabled: timeBetweenPoints.enabled,
    timeBetweenPointsCallouts: timeBetweenPoints.callouts,
    setTimeBetweenPointsEnabled: timeBetweenPoints.setEnabled,
    updateTimeBetweenPointsCallout: timeBetweenPoints.updateCallout,

    timeoutEnabled: timeout.enabled,
    timeoutCallouts: timeout.callouts,
    setTimeoutEnabled: timeout.setEnabled,
    updateTimeoutCallout: timeout.updateCallout,

    timeoutBetweenPointsEnabled: timeoutBetweenPoints.enabled,
    timeoutBetweenPointsCallouts: timeoutBetweenPoints.callouts,
    setTimeoutBetweenPointsEnabled: timeoutBetweenPoints.setEnabled,
    updateTimeoutBetweenPointsCallout: timeoutBetweenPoints.updateCallout,
  };
});

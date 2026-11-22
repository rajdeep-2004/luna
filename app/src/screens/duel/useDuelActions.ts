import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Share } from 'react-native';
import type { DuelView } from '@luna/shared';
import { duelsApi, userMessage } from '../../api';
import type { AppStackParams } from '../../navigation/types';

export const DUELS_KEY = ['duels'] as const;

/** Opens the system share sheet with the code. Dismissing it is not an error. */
export async function shareDuelCode(code: string): Promise<void> {
  try {
    await Share.share({
      message: `Duel me on Luna ⚔️ Enter code ${code} in the Duel tab. 5 questions, 60 seconds each.`,
    });
  } catch {
    // The share sheet failed to open: the code is still on screen to read out.
  }
}

/** The duel rules, shown once before the timer starts, so nobody is surprised by the countdown. */
export function confirmReady(rivalName: string | null, onPlay: () => void): void {
  Alert.alert(
    rivalName ? `Duel @${rivalName}` : 'Play your duel',
    '5 questions, 60 seconds each, no hints. The timer starts as soon as you begin.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Begin', onPress: onPlay },
    ],
  );
}

/**
 * Create, join and play, each guarded by `pending` so a double tap never sends a second request
 * (a second create would open a second duel).
 */
export function useDuelActions() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<'create' | 'join' | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: DUELS_KEY });

  async function run<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    if (pending) return null;
    setPending(key);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(userMessage(e));
      return null;
    } finally {
      setPending(null);
    }
  }

  async function create(): Promise<DuelView | null> {
    const duel = await run('create', duelsApi.create);
    if (duel) {
      void refresh();
      await shareDuelCode(duel.code);
    }
    return duel;
  }

  async function join(code: string): Promise<DuelView | null> {
    const duel = await run('join', () => duelsApi.join(code));
    if (duel) void refresh();
    return duel;
  }

  async function play(duelId: string): Promise<void> {
    const session = await run(duelId, () => duelsApi.play(duelId));
    if (session) navigation.navigate('Session', { sessionId: session.id });
  }

  return { create, join, play, pending, error, clearError: () => setError(null) };
}

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Share } from 'react-native';
import type { DuelFormat, DuelSnapshot } from '@luna/shared';
import { bladeOf, rulesLine } from '../../lib/duelFormats';
import { duelsApi, userMessage } from '../../api';
import type { AppStackParams } from '../../navigation/types';

export const DUELS_KEY = ['duels'] as const;

/** Opens the system share sheet with the code. Dismissing it is not an error. */
export async function shareDuelCode(code: string, format?: DuelFormat): Promise<void> {
  try {
    await Share.share({
      message: `Duel me on Luna: ${bladeOf(format).name}. Enter code ${code} in the Duel tab. ${rulesLine(format)}`,
    });
  } catch {
    // The share sheet failed to open: the code is still on screen to read out.
  }
}

/**
 * Create and join, each guarded by `pending` so a double tap never sends a second request (a second
 * create would hit the one-open-duel rule). Live play arrives in P14 (D-052); until then both open
 * the duel's page, which shows the lobby or the result.
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

  const openDuel = (duelId: string) => navigation.navigate('DuelResult', { duelId });

  async function create(format: DuelFormat): Promise<DuelSnapshot | null> {
    const duel = await run('create', () => duelsApi.create(format));
    if (duel) {
      void refresh();
      await shareDuelCode(duel.code, duel.format);
      openDuel(duel.id);
    }
    return duel;
  }

  async function join(code: string): Promise<DuelSnapshot | null> {
    const duel = await run('join', () => duelsApi.join(code));
    if (duel) {
      void refresh();
      openDuel(duel.id);
    }
    return duel;
  }

  return { create, join, openDuel, pending, error, clearError: () => setError(null) };
}

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Share } from 'react-native';
import {
  ENDED_PHASES,
  type DuelFormat,
  type DuelPhase,
  type DuelSnapshot,
  type DuelView,
} from '@luna/shared';
import { bladeOf, rulesLine } from '../../lib/duelFormats';
import { duelsApi, userMessage } from '../../api';
import type { AppStackParams } from '../../navigation/types';

export const DUELS_KEY = ['duels'] as const;
/** One duel's snapshot in the query cache; create/join seed it so the live screen draws at once. */
export const duelKey = (duelId: string) => ['duel', duelId] as const;
export const isEndedDuel = (d: Pick<DuelView, 'phase'>) =>
  (ENDED_PHASES as readonly DuelPhase[]).includes(d.phase);

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
 * create would hit the one-open-duel rule). Both go straight to the live duel screen (P14): the
 * creator lands on the lobby with the code and a Share button, the joiner on the face-off.
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

  /** A live duel opens the match screen; an ended one its result. */
  const openDuel = (duel: Pick<DuelView, 'id' | 'phase'>) =>
    navigation.navigate(isEndedDuel(duel) ? 'DuelResult' : 'LiveDuel', { duelId: duel.id });

  const enter = (duel: DuelSnapshot) => {
    queryClient.setQueryData(duelKey(duel.id), duel);
    void refresh();
    openDuel(duel);
  };

  async function create(format: DuelFormat): Promise<DuelSnapshot | null> {
    const duel = await run('create', () => duelsApi.create(format));
    if (duel) enter(duel);
    return duel;
  }

  async function join(code: string): Promise<DuelSnapshot | null> {
    const duel = await run('join', () => duelsApi.join(code));
    if (duel) enter(duel);
    return duel;
  }

  return { create, join, openDuel, pending, error, clearError: () => setError(null) };
}

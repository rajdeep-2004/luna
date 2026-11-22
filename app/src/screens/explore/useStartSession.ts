import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import type { StartSessionRequest } from '@luna/shared';
import { sessionsApi, userMessage } from '../../api';
import type { AppStackParams } from '../../navigation/types';

/** Starts (or resumes) a session and opens it. `pending` blocks double taps while the request runs. */
/** `replace` swaps the current screen (used from the summary) instead of stacking the new session on top. */
export function useStartSession(replace = false) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(key: string, body: StartSessionRequest) {
    if (pendingKey) return;
    setPendingKey(key);
    setError(null);
    try {
      const session = await sessionsApi.start(body);
      if (replace) navigation.replace('Session', { sessionId: session.id });
      else navigation.navigate('Session', { sessionId: session.id });
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setPendingKey(null);
    }
  }
  return { start, pendingKey, error };
}

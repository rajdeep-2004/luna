import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { dailyApi, userMessage } from '../../api';
import type { AppStackParams } from '../../navigation/types';

/**
 * Opens today's Kata: the server builds it on the first tap of the day, so it's only created when
 * the user actually starts (the completion-rate metric counts started Katas). A finished Kata
 * opens its result. `pending` blocks double taps.
 */
export function useBeginKata() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { session, summary } = await dailyApi.today();
      if (summary) navigation.navigate('Summary', { sessionId: session.id });
      else navigation.navigate('Session', { sessionId: session.id });
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setPending(false);
    }
  }
  return { begin, pending, error };
}

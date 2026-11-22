import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DUEL_TIMEOUT_ANSWER, type AnswerResult } from '@luna/shared';
import { ApiError, sessionsApi, userMessage } from '../../api';
import type { Step } from '../../lib/session';

/**
 * Local state for the question on screen: the selection, the hint, the server's verdict, and in-flight flags.
 * Everything authoritative (position, answers) is refetched from the server after each answer.
 */
export function useAnswerFlow(sessionId: string, step: Step | null) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSelected(null);
    setResult(null);
    setHint(null);
    setError(null);
  };

  /** `answer` overrides the selection: the duel timer sends a timeout with nothing selected. */
  async function submit(answer: string | null = selected) {
    if (!step || !answer || submitting || result) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await sessionsApi.answer(sessionId, {
        challengeId: step.item.challenge.id,
        stageIndex: step.stageIndex,
        answer,
      });
      setResult(r);
    } catch (e) {
      // 409 means this answer was already recorded (a retry after a lost response): resync instead of failing.
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        reset();
        await queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      } else {
        setError(userMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function revealHint() {
    if (!step || hint || submitting) return;
    try {
      const r = await sessionsApi.hint(sessionId, {
        challengeId: step.item.challenge.id,
        stageIndex: step.stageIndex,
      });
      setHint(r.hint);
    } catch (e) {
      setError(userMessage(e));
    }
  }

  const submitTimeout = () => submit(DUEL_TIMEOUT_ANSWER);

  return {
    selected,
    setSelected,
    result,
    hint,
    submitting,
    error,
    submit,
    submitTimeout,
    revealHint,
    reset,
  };
}

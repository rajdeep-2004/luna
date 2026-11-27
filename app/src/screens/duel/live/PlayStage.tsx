import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DUEL_FORMAT_RULES, type DuelSnapshot, type PublicChallenge } from '@luna/shared';
import { YokaiMask } from '../../../art/YokaiMask';
import { AppText, BrushMarks, Button, PressableSink } from '../../../components';
import { config } from '../../../config/env';
import { formatOrClassic } from '../../../lib/duelFormats';
import { haptic } from '../../../lib/haptics';
import { msUntil } from '../../../lib/live/clock';
import { roundAt, runningScore } from '../../../lib/live/state';
import { useNow } from '../../../lib/live/useNow';
import { layout, spacing } from '../../../theme';
import { BugHuntBody } from '../../game/BugHuntBody';
import { ChoiceBody } from '../../game/ChoiceBody';
import type { ChallengeStep, Verdict } from '../../game/bodyTypes';
import { RevealPanel } from './RevealPanel';
import { TimerRing } from './TimerRing';

type Failure = { code: string; message: string };
type Props = {
  duel: DuelSnapshot;
  offsetMs: number;
  answer: (index: number, answer: string) => Promise<Failure | null>;
  onLeave: () => void;
};

/** Server refusals that mean the question closed under us: not something a retry fixes. */
const CLOSED = new Set(['LATE', 'NOT_CURRENT']);

const stepOf = (q: PublicChallenge): ChallengeStep => ({
  item: { challenge: q },
  prompt: q.prompt,
  options: q.options ?? [],
});

/**
 * QUESTION and REVEAL for one question (the parent keys it by index, so every question starts
 * clean). It reuses the practice renderers. My answer is locked from the tap of Strike: the
 * button shows pending until the server's ack, a second tap does nothing, and after the ack the
 * question stays locked. The rival's status is only "thinking" or "answered", never their choice.
 */
export function PlayStage({ duel, offsetMs, answer, onLeave }: Props) {
  const index = duel.currentIndex;
  const q = duel.question;
  const rules = DUEL_FORMAT_RULES[formatOrClassic(duel.format)];
  const round = duel.phase === 'REVEAL' ? roundAt(duel, index) : null;
  const myResult = round?.results.find((r) => r.userId === duel.me.id) ?? null;
  const now = useNow(config.live.timerTickMs, !round);
  const leftMs = round ? 0 : msUntil(duel.deadlineAt, offsetMs, now);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  // The reveal strikes: a heavy haptic for a cut, the warning buzz for a miss.
  const revealed = !!round;
  const correct = !!myResult?.isCorrect;
  useEffect(() => {
    if (!revealed) return;
    if (correct) haptic.heavy();
    else haptic.error();
  }, [revealed, correct]);

  const timeUp = !round && leftMs <= 0;
  const locked = submitting || !!duel.myAnswer || revealed || timeUp;

  async function strike() {
    if (!selected || locked || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    haptic.light();
    const failed = await answer(index, selected);
    inFlight.current = false;
    setSubmitting(false);
    if (failed) setError(CLOSED.has(failed.code) ? "Time's up for this one." : failed.message);
  }

  if (!q) return null;
  const score = runningScore(duel);
  const verdict: Verdict | null = round
    ? { correctAnswer: round.correctAnswer, isCorrect: correct }
    : null;
  const shown = round ? (myResult?.answer ?? null) : selected;
  const body = {
    step: stepOf(q),
    selected: shown,
    result: verdict,
    onSelect: (a: string) => {
      haptic.selection();
      setSelected(a);
    },
    locked,
  };
  const rivalName = duel.rival ? `@${duel.rival.username}` : 'Rival';

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <PressableSink
          onPress={onLeave}
          accessibilityRole="button"
          accessibilityLabel="Leave the duel"
          style={styles.leave}
        >
          <AppText color="muted">✕</AppText>
        </PressableSink>
        <View style={styles.headMid}>
          <AppText variant="label" color="muted">
            {index + 1} / {duel.total}
          </AppText>
          <AppText
            variant="title"
            accessibilityLabel={`Score: you ${score.mine}, ${rivalName} ${score.rivals}`}
          >
            {score.mine} – {score.rivals}
          </AppText>
        </View>
        <TimerRing leftMs={leftMs} totalMs={rules.timerMs} stopped={revealed} />
      </View>
      <BrushMarks total={duel.total} done={duel.rounds.length} />
      {!revealed && duel.rival ? <RivalStatus duel={duel} name={rivalName} /> : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {q.type === 'BUG_HUNT' ? <BugHuntBody {...body} /> : <ChoiceBody {...body} />}
      </ScrollView>

      <View style={styles.actions}>
        {error ? (
          <AppText color="primary" accessibilityRole="alert" style={styles.center}>
            {error}
          </AppText>
        ) : null}
        {round ? (
          <RevealPanel duel={duel} round={round} />
        ) : duel.myAnswer ? (
          <AppText variant="title" style={styles.center} accessibilityLiveRegion="polite">
            {duel.rivalAnswered ? 'Both struck…' : `Locked in. ${rivalName} is thinking…`}
          </AppText>
        ) : timeUp ? (
          <AppText variant="title" color="muted" style={styles.center} accessibilityLiveRegion="polite">
            Time&apos;s up…
          </AppText>
        ) : (
          <Button
            label="Strike"
            onPress={() => void strike()}
            disabled={!selected}
            pending={submitting}
          />
        )}
      </View>
    </View>
  );
}

/** The rival's mask and one word: thinking, answered, or gone. */
function RivalStatus({ duel, name }: { duel: DuelSnapshot; name: string }) {
  const offline = duel.seats.rival?.connected === false;
  const word = offline ? 'connection lost' : duel.rivalAnswered ? 'answered' : 'thinking…';
  return (
    <View style={styles.rival} accessible accessibilityLabel={`${name} ${word}`}>
      {duel.rival ? <YokaiMask id={duel.rival.avatarId} size={26} /> : null}
      <AppText variant="label" color={duel.rivalAnswered && !offline ? 'primary' : 'muted'}>
        {name} · {word}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: layout.screenPadding },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  headMid: { alignItems: 'center' },
  leave: { width: layout.touchTarget, height: layout.touchTarget, justifyContent: 'center' },
  rival: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  content: { gap: spacing.lg, paddingVertical: spacing.lg },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg, minHeight: 72, justifyContent: 'center' },
  center: { textAlign: 'center' },
});

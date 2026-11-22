import { StyleSheet, View } from 'react-native';
import type { AssessmentScore, BonusAward, SessionSummary } from '@luna/shared';
import { AppText, Card } from '../../components';
import { spacing } from '../../theme';

const BONUS_LABEL: Record<BonusAward['kind'], (b: BonusAward) => string> = {
  DAILY_KATA: () => 'Daily Kata complete',
  PERFECT_KATA: () => 'Perfect Kata',
  FIRST_INCIDENT: () => 'First Incident Room',
  STREAK_MILESTONE: (b) => `${b.days}-day streak`,
  DUEL_WIN: () => 'Duel won',
};

/** Bonuses, the lantern and fixed mistakes: what this session did for progress. */
export function ProgressCard({ summary }: { summary: SessionSummary }) {
  const { bonuses, streak, fixedMistakes } = summary;
  if (!bonuses.length && !streak && !fixedMistakes) return null;
  return (
    <Card style={styles.card}>
      {streak ? (
        <AppText color="moon">
          {streak.current === 1 ? 'Lantern lit: day 1' : `Lantern lit: ${streak.current} days`}
          {streak.current > 1 && streak.current === streak.longest ? ' · your longest yet' : ''}
        </AppText>
      ) : null}
      {fixedMistakes > 0 ? (
        <AppText color="textSoft">
          {fixedMistakes === 1
            ? 'You fixed a past mistake.'
            : `You fixed ${fixedMistakes} past mistakes.`}
        </AppText>
      ) : null}
      {bonuses.map((b) => (
        <View key={`${b.kind}${b.days ?? ''}`} style={styles.row}>
          <AppText color="textSoft">{BONUS_LABEL[b.kind](b)}</AppText>
          <AppText color="moon">+{b.xp} XP</AppText>
        </View>
      ))}
    </Card>
  );
}

/** benchmarks.md §1: "Baseline 2/5 → Checkpoint 4/5". */
export function CheckpointComparison({
  baseline,
  summary,
}: {
  baseline: AssessmentScore | null;
  summary: SessionSummary;
}) {
  const now = `${summary.correctAnswers}/${summary.totalAnswers}`;
  return (
    <Card style={styles.card}>
      <AppText variant="label" color="textMuted">
        How far you&apos;ve come
      </AppText>
      <AppText variant="button">
        {baseline
          ? `Baseline ${baseline.correct}/${baseline.total} → Checkpoint ${now}`
          : `Checkpoint ${now}`}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});

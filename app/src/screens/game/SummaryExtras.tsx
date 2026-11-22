import { StyleSheet, View } from 'react-native';
import type { AssessmentScore, BonusAward, SessionSummary } from '@luna/shared';
import { AppText } from '../../components';
import { colors, spacing } from '../../theme';

const BONUS_LABEL: Record<BonusAward['kind'], (b: BonusAward) => string> = {
  DAILY_KATA: () => 'Daily Kata complete',
  PERFECT_KATA: () => 'Perfect Kata',
  FIRST_INCIDENT: () => 'First Incident Room',
  STREAK_MILESTONE: (b) => `${b.days}-day streak`,
  DUEL_WIN: () => 'Duel won',
};

/** progression.md §7: "Achievement unlocked", shown once, on the completion that earned it. No emoji (DESIGN.md). */
export function Achievements({ summary }: { summary: SessionSummary }) {
  const unlocked = summary.newAchievements ?? [];
  if (!unlocked.length) return null;
  return (
    <View style={styles.block}>
      <AppText variant="label" color="primary" accessibilityRole="alert" style={styles.center}>
        Achievement unlocked
      </AppText>
      {unlocked.map((a) => (
        <AppText key={a.key} variant="title" style={styles.center}>
          {a.name}
        </AppText>
      ))}
    </View>
  );
}

/** Bonuses, the lantern and fixed mistakes: what this session did for progress. */
export function ProgressNotes({ summary }: { summary: SessionSummary }) {
  const { bonuses, streak, fixedMistakes } = summary;
  if (!bonuses.length && !streak && !fixedMistakes) return null;
  return (
    <View style={[styles.block, styles.ruled]}>
      {streak ? (
        <AppText color="primary" style={styles.center}>
          {streak.current === 1 ? 'Lantern lit: day 1' : `Lantern lit: ${streak.current} days`}
          {streak.current > 1 && streak.current === streak.longest ? ' · your longest yet' : ''}
        </AppText>
      ) : null}
      {fixedMistakes > 0 ? (
        <AppText color="muted" style={styles.center}>
          {fixedMistakes === 1
            ? 'You fixed a past mistake.'
            : `You fixed ${fixedMistakes} past mistakes.`}
        </AppText>
      ) : null}
      {bonuses.map((b) => (
        <View key={`${b.kind}${b.days ?? ''}`} style={styles.row}>
          <AppText color="muted">{BONUS_LABEL[b.kind](b)}</AppText>
          <AppText color="primary">+{b.xp} XP</AppText>
        </View>
      ))}
    </View>
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
    <View style={[styles.block, styles.ruled]}>
      <AppText variant="label" color="muted" style={styles.center}>
        How far you&apos;ve come
      </AppText>
      <AppText variant="title" style={styles.center}>
        {baseline
          ? `Baseline ${baseline.correct}/${baseline.total} → Checkpoint ${now}`
          : `Checkpoint ${now}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  /** A thin wood rule instead of a card: sections sit on the ground, not in boxes (DESIGN.md). */
  ruled: { borderTopWidth: 1, borderTopColor: colors.wood, paddingTop: spacing.lg },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});

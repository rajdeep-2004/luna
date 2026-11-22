import { Pressable, StyleSheet, View } from 'react-native';
import type { ProgressView, TopicSlug } from '@luna/shared';
import { AppText, Card, MoonPhase } from '../../components';
import { MOON_FOR, MOON_LABEL } from '../../lib/moon';
import { layout, radii, spacing } from '../../theme';

type Props = {
  progress: ProgressView;
  topicName: (slug: TopicSlug) => string;
  busy: boolean;
  disabled: boolean;
  onPractise: (slug: TopicSlug) => void;
};

/** progression.md §3: the weakest topic as one tappable card, with the five moons beneath it. */
export function WeakestBlade({ progress, topicName, busy, disabled, onPractise }: Props) {
  const weakest = progress.weakestTopic;
  const row = progress.topics.find((t) => t.topicSlug === weakest);
  return (
    <Card style={styles.card}>
      {weakest && row ? (
        <Pressable
          onPress={() => onPractise(weakest)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Your weakest blade: ${topicName(weakest)}, ${MOON_LABEL[row.phase]}. Practise 5 questions.`}
          accessibilityState={{ disabled, busy }}
          style={({ pressed }) => [styles.blade, pressed && styles.pressed]}
        >
          <MoonPhase phase={MOON_FOR[row.phase]} size={40} />
          <View style={styles.text}>
            <AppText variant="label" color="textMuted">
              Your weakest blade
            </AppText>
            <AppText variant="button">{topicName(weakest)}</AppText>
            <AppText color="moon">{busy ? 'Opening…' : 'Practise 5 questions →'}</AppText>
          </View>
        </Pressable>
      ) : null}
      <View style={styles.moons} accessible accessibilityLabel={moonsLabel(progress, topicName)}>
        {progress.topics.map((t) => (
          <View key={t.topicSlug} style={styles.moon}>
            <MoonPhase phase={MOON_FOR[t.phase]} size={28} />
          </View>
        ))}
      </View>
    </Card>
  );
}

function moonsLabel(p: ProgressView, name: (s: TopicSlug) => string): string {
  return p.topics.map((t) => `${name(t.topicSlug)}: ${MOON_LABEL[t.phase]}`).join(', ');
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, padding: spacing.lg },
  blade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: layout.touchTarget,
    borderRadius: radii.card,
  },
  text: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.85 },
  moons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  moon: { alignItems: 'center' },
});

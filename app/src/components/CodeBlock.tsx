import { Pressable, StyleSheet, View } from 'react-native';
import { colors, layout, radii, spacing, typography } from '../theme';
import { AppText } from './AppText';
import { Marker, type MarkState } from './Marker';

type Props = {
  code: string;
  /** Provide to make lines tappable (Bug Hunt). Receives the 1-based line number. */
  onSelectLine?: (line: number) => void;
  /** Visual state per 1-based line number. */
  lineStates?: Record<number, MarkState>;
};

/** Monospace snippet with a line-number gutter. Plain text, no syntax colours. */
export function CodeBlock({ code, onSelectLine, lineStates = {} }: Props) {
  const lines = code.split('\n');
  return (
    <View style={styles.block}>
      {lines.map((text, i) => (
        <CodeLine
          key={i}
          number={i + 1}
          text={text}
          state={lineStates[i + 1] ?? 'none'}
          onPress={onSelectLine ? () => onSelectLine(i + 1) : undefined}
        />
      ))}
    </View>
  );
}

type LineProps = { number: number; text: string; state: MarkState; onPress?: () => void };

export function CodeLine({ number, text, state, onPress }: LineProps) {
  const lit = state === 'selected' || state === 'correct';
  const content = (
    <View
      style={[
        styles.line,
        state === 'selected' && styles.selected,
        state === 'correct' && styles.correct,
        state === 'wrong' && styles.wrong,
      ]}
    >
      <AppText color={lit ? 'wood' : 'muted'} style={[typography.code, styles.gutter]}>
        {number}
      </AppText>
      <AppText color={lit ? 'onShoji' : 'text'} style={[typography.code, styles.code]}>
        {text === '' ? ' ' : text}
      </AppText>
      {state === 'correct' || state === 'wrong' ? <Marker state={state} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Line ${number}: ${text}`}
      accessibilityState={{ selected: state === 'selected' }}
      style={styles.pressable}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.tatami,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  pressable: { minHeight: layout.touchTarget - 8 },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
  },
  gutter: { width: 20, textAlign: 'right' },
  code: { flex: 1 },
  selected: { backgroundColor: colors.shoji },
  correct: { backgroundColor: colors.shoji },
  wrong: { backgroundColor: colors.wallLight },
});

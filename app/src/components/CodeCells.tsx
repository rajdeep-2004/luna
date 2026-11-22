import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fontFamily, radii, spacing } from '../theme';
import { AppText } from './AppText';

type Props = {
  value: string;
  onChange: (v: string) => void;
  length: number;
  /** Called when the last cell is filled or the keyboard's Go is pressed. */
  onSubmit: () => void;
  label: string;
  error?: string | null;
};

/**
 * Six code cells you type straight into (DESIGN.md: Duel). One real TextInput sits invisibly on top
 * of the cells, so paste, autofill and the screen reader all work as with a normal field; the cells
 * only draw what it holds, with an amber underline on the next cell.
 */
export function CodeCells({ value, onChange, length, onSubmit, label, error }: Props) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length }, (_, i) => value[i] ?? '');

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.cells}
        onPress={() => input.current?.focus()}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {cells.map((c, i) => (
          <View
            key={i}
            style={[styles.cell, focused && i === Math.min(value.length, length - 1) && styles.cur]}
          >
            <AppText variant="code" style={styles.char}>
              {c}
            </AppText>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => {
          const v = t
            .replace(/[^A-Za-z0-9]/g, '')
            .toUpperCase()
            .slice(0, length);
          onChange(v);
          if (v.length === length) onSubmit();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={length}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        accessibilityLabel={label}
        style={styles.input}
        caretHidden
      />
      {error ? (
        <AppText color="primary" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  cells: { flexDirection: 'row', gap: 6 },
  cell: {
    width: 36,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.tatami,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cur: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  char: { fontFamily: fontFamily.mono, fontSize: 18, color: colors.text },
  input: { position: 'absolute', top: 0, left: 0, width: 6 * 42, height: 44, opacity: 0.02 },
});

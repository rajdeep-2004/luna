import { Text, type TextProps } from 'react-native';
import { colors, typography, type ColorToken, type TypeRole } from '../theme';

type Props = TextProps & { variant?: TypeRole; color?: ColorToken };

/** Text with a design-system role. Respects Dynamic Type up to 1.3x (ui-design.md §8). */
export function AppText({ variant = 'body', color = 'text', style, ...rest }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[typography[variant], { color: colors[color] }, style]}
      {...rest}
    />
  );
}

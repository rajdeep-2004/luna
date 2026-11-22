import { View } from 'react-native';
import { OptionRow } from '../../components';
import { spacing } from '../../theme';
import { optionState, type BodyProps } from './bodyTypes';

/** The four shuffled options, used by Trace, Engineer's Choice and each incident stage. */
export function OptionList({ step, selected, result, onSelect, locked }: BodyProps) {
  return (
    <View style={{ gap: spacing.md }} accessibilityRole="radiogroup">
      {step.options.map((o) => (
        <OptionRow
          key={o.id}
          text={o.text}
          state={optionState(o.id, selected, result)}
          disabled={locked}
          onPress={() => onSelect(o.id)}
        />
      ))}
    </View>
  );
}

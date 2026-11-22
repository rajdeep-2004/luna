import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Screen } from '../../components';
import type { AppStackParams } from '../../navigation/types';
import { spacing } from '../../theme';
import { useStartSession } from '../explore/useStartSession';

type Props = NativeStackScreenProps<AppStackParams, 'BaselineIntro'>;

/**
 * users.md §5 step 2: the optional baseline, offered once after onboarding. It sets each topic's
 * starting difficulty and is the "before" score a later Checkpoint is compared with.
 */
export function BaselineIntroScreen({ navigation }: Props) {
  const { start, pendingKey, error } = useStartSession(true);
  return (
    <Screen>
      <View style={styles.body}>
        <AppText variant="label" color="primary">
          Before your first kata
        </AppText>
        <AppText variant="title">One quick check?</AppText>
        <AppText color="text">
          Five beginner questions, one per topic, about two minutes. There&apos;s no XP and no wrong
          way to do it: it only tunes where each topic starts for you.
        </AppText>
      </View>
      <View style={styles.actions}>
        {error ? (
          <AppText color="primary" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        <Button
          label="Take the baseline"
          pending={pendingKey === 'baseline'}
          onPress={() => void start('baseline', { type: 'BASELINE' })}
        />
        <Button
          label="Skip for now"
          variant="ghost"
          disabled={pendingKey !== null}
          onPress={() => navigation.goBack()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: spacing.md },
  actions: { gap: spacing.sm, paddingBottom: spacing.lg },
});

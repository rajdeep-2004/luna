import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText, Button, Screen } from '../../components';
import type { AppStackParams } from '../../navigation/types';

/** Stub: replaced by the real summary in the next commit. */
export function SummaryScreen({ navigation }: NativeStackScreenProps<AppStackParams, 'Summary'>) {
  return (
    <Screen>
      <AppText>Session complete</AppText>
      <Button label="Done" onPress={() => navigation.popToTop()} />
    </Screen>
  );
}

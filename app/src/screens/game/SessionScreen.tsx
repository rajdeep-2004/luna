import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText, Screen } from '../../components';
import type { AppStackParams } from '../../navigation/types';

export function SessionScreen({ route }: NativeStackScreenProps<AppStackParams, 'Session'>) {
  return (
    <Screen>
      <AppText>Session {route.params.sessionId}</AppText>
    </Screen>
  );
}

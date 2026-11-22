import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SessionScreen } from '../screens/game/SessionScreen';
import { SummaryScreen } from '../screens/game/SummaryScreen';
import { BaselineIntroScreen } from '../screens/onboarding/BaselineIntroScreen';
import { DojoBoardScreen } from '../screens/board/DojoBoardScreen';
import { DuelResultScreen } from '../screens/duel/DuelResultScreen';
import { colors } from '../theme';
import { MainTabs } from './MainTabs';
import type { AppStackParams } from './types';

const Stack = createNativeStackNavigator<AppStackParams>();

export function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}
    >
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Session" component={SessionScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Summary" component={SummaryScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="BaselineIntro" component={BaselineIntroScreen} />
      <Stack.Screen name="DojoBoard" component={DojoBoardScreen} />
      <Stack.Screen name="DuelResult" component={DuelResultScreen} />
    </Stack.Navigator>
  );
}

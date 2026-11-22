import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SessionScreen } from '../screens/game/SessionScreen';
import { SummaryScreen } from '../screens/game/SummaryScreen';
import { BaselineIntroScreen } from '../screens/onboarding/BaselineIntroScreen';
import { colors } from '../theme';
import { MainTabs } from './MainTabs';
import type { AppStackParams } from './types';

const Stack = createNativeStackNavigator<AppStackParams>();

export function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Session" component={SessionScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Summary" component={SummaryScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="BaselineIntro" component={BaselineIntroScreen} />
    </Stack.Navigator>
  );
}

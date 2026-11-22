import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AvatarScreen } from '../screens/onboarding/AvatarScreen';
import { LevelScreen } from '../screens/onboarding/LevelScreen';
import { TopicsScreen } from '../screens/onboarding/TopicsScreen';
import { colors } from '../theme';
import type { OnboardingStackParams } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParams>();

export function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
    >
      <Stack.Screen name="Avatar" component={AvatarScreen} />
      <Stack.Screen name="Topics" component={TopicsScreen} />
      <Stack.Screen name="Level" component={LevelScreen} />
    </Stack.Navigator>
  );
}

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlaceholderScreen, ProfilePlaceholder } from '../screens/tabs/PlaceholderScreen';
import { colors, fontFamily } from '../theme';
import type { MainTabParams } from './types';

const Tab = createBottomTabNavigator<MainTabParams>();

const Dojo = () => (
  <PlaceholderScreen title="Dojo" message="Your Daily Kata and streak appear here soon." />
);
const Explore = () => (
  <PlaceholderScreen title="Explore" message="Topic practice arrives in the next phase." />
);
const Duel = () => (
  <PlaceholderScreen title="Duel" message="Challenge a friend. Coming in a later phase." />
);

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.moon,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.track },
        tabBarLabelStyle: { fontFamily: fontFamily.sansMedium, fontSize: 12 },
        tabBarIconStyle: { display: 'none' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tab.Screen name="Dojo" component={Dojo} />
      <Tab.Screen name="Explore" component={Explore} />
      <Tab.Screen name="Duel" component={Duel} />
      <Tab.Screen name="Profile" component={ProfilePlaceholder} />
    </Tab.Navigator>
  );
}

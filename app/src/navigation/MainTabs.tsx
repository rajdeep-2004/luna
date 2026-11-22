import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DojoScreen } from '../screens/dojo/DojoScreen';
import { ExploreScreen } from '../screens/explore/ExploreScreen';
import { PlaceholderScreen, ProfilePlaceholder } from '../screens/tabs/PlaceholderScreen';
import { colors, fontFamily } from '../theme';
import type { MainTabParams } from './types';

const Tab = createBottomTabNavigator<MainTabParams>();

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
      <Tab.Screen name="Dojo" component={DojoScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Duel" component={Duel} />
      <Tab.Screen name="Profile" component={ProfilePlaceholder} />
    </Tab.Navigator>
  );
}

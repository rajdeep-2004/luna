import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DojoScreen } from '../screens/dojo/DojoScreen';
import { ExploreScreen } from '../screens/explore/ExploreScreen';
import { DuelScreen } from '../screens/duel/DuelScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { colors } from '../theme';
import { TabBar } from './TabBar';
import type { MainTabParams } from './types';

const Tab = createBottomTabNavigator<MainTabParams>();

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.ground } }}
    >
      <Tab.Screen name="Dojo" component={DojoScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Duel" component={DuelScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

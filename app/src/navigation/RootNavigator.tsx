import { ActivityIndicator, View } from 'react-native';
import { ErrorState, Screen } from '../components';
import { useAuthStore } from '../store/auth';
import { colors } from '../theme';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { OnboardingStack } from './OnboardingStack';

/** Picks the stack from the auth state. Swapping stacks (not pushing) means Back can never return to a stale one. */
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);

  if (status === 'hydrating') {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (status === 'error') {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState
            message="We could not reach the server to check your login. Check your connection and try again."
            onRetry={() => void hydrate()}
          />
        </View>
      </Screen>
    );
  }
  if (status === 'signedOut' || !user) return <AuthStack />;
  return user.onboarded ? <AppStack /> : <OnboardingStack />;
}

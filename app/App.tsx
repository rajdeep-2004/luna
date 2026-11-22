import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './src/api';
import { WakingServer } from './src/components';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/auth';
import { useConnectionStore } from './src/store/connection';
import { colors, fontAssets, spacing } from './src/theme';

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.ground, card: colors.ground },
};

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const hydrate = useAuthStore((s) => s.hydrate);
  const waking = useConnectionStore((s) => s.waking);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
        {waking ? (
          <View style={styles.waking} pointerEvents="none">
            <WakingServer />
          </View>
        ) : null}
        <StatusBar style="light" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  waking: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.giant + spacing.xl,
  },
});

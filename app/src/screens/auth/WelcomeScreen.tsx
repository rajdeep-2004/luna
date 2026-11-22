import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, MoonPhase, Screen } from '../../components';
import type { AuthStackParams } from '../../navigation/types';
import { spacing } from '../../theme';

export function WelcomeScreen({ navigation }: NativeStackScreenProps<AuthStackParams, 'Welcome'>) {
  return (
    <Screen>
      <View style={styles.hero}>
        <MoonPhase phase="gibbous" size={120} />
        <AppText variant="display">Luna</AppText>
        <AppText color="textMuted" style={styles.center}>
          Train your engineering intuition in five-minute challenges.
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button label="Create account" onPress={() => navigation.navigate('Register')} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  center: { textAlign: 'center' },
  actions: { gap: spacing.sm, paddingBottom: spacing.xl },
});

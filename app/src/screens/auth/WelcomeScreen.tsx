import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Lantern } from '../../art/Lantern';
import { AppText, Button, Screen } from '../../components';
import { useReduceMotion } from '../../lib/motion';
import type { AuthStackParams } from '../../navigation/types';
import { spacing } from '../../theme';
import { ComingHome } from '../dojo/ComingHome';

/**
 * Welcome (DESIGN.md: Auth): the shoji slide open on a lit lantern, the name lands, then the two
 * ways in. A first look at the dojo, not a form.
 */
export function WelcomeScreen({ navigation }: NativeStackScreenProps<AuthStackParams, 'Welcome'>) {
  const reduce = useReduceMotion();
  const [opened, setOpened] = useState(false);
  const enter = (delay: number) => (reduce ? undefined : FadeInDown.duration(420).delay(delay));
  return (
    <Screen>
      <View style={styles.hero}>
        <Animated.View entering={enter(300)}>
          <Lantern streak={0} state="lit" width={88} showCaption={false} />
        </Animated.View>
        <Animated.View entering={enter(520)} style={styles.center}>
          <AppText variant="display" style={styles.title}>
            Luna
          </AppText>
          <AppText color="muted" style={styles.centerText}>
            A dojo for engineers. Five-minute fights with real code.
          </AppText>
        </Animated.View>
      </View>
      <Animated.View entering={enter(700)} style={styles.actions}>
        <Button label="Enter the dojo" onPress={() => navigation.navigate('Register')} />
        <Button
          label="I already train here"
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
        />
      </Animated.View>
      {!opened ? <ComingHome onDone={() => setOpened(true)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  center: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 44, lineHeight: 52 },
  centerText: { textAlign: 'center' },
  actions: { gap: spacing.sm, paddingBottom: spacing.xl },
});

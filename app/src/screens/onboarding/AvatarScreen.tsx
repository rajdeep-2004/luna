import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AVATAR_IDS, type AvatarId } from '@luna/shared';
import { YokaiMask } from '../../art/YokaiMask';
import { AppText, PressableSink } from '../../components';
import { useReduceMotion } from '../../lib/motion';
import type { OnboardingStackParams } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboarding';
import { colors, layout, radii, spacing } from '../../theme';
import { OnboardingStep } from './OnboardingStep';

const PER_ROW = 4;
const NAMES: Record<AvatarId, string> = {
  kitsune: 'Kitsune, the fox',
  tanuki: 'Tanuki, the trickster',
  oni: 'Oni, the ogre',
  tengu: 'Tengu, the mountain spirit',
  neko: 'Neko, the cat',
  ryu: 'Ryu, the dragon',
  usagi: 'Usagi, the moon rabbit',
  kappa: 'Kappa, the river imp',
};

/** One mask hanging from its peg. The chosen one is lifted off the rack. */
function HangingMask({
  id,
  on,
  size,
  onPress,
}: {
  id: AvatarId;
  on: boolean;
  size: number;
  onPress: () => void;
}) {
  const reduce = useReduceMotion();
  const lift = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lift.value = reduce ? (on ? 1 : 0) : withSpring(on ? 1 : 0, { damping: 12, stiffness: 200 });
  }, [on, reduce, lift]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * lift.value }, { scale: 1 + 0.08 * lift.value }],
  }));
  return (
    <PressableSink
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={NAMES[id]}
      style={[styles.slot, { width: size + 12 }]}
    >
      <View style={styles.cord} />
      <Animated.View style={style}>
        <YokaiMask id={id} size={size} />
      </Animated.View>
      <View style={[styles.seal, on && styles.sealOn]} />
    </PressableSink>
  );
}

/** Onboarding step 1: pick your mask from the wooden rack (DESIGN.md: Onboarding). */
export function AvatarScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParams, 'Avatar'>) {
  const { avatarId, setAvatar } = useOnboardingStore();
  const { width } = useWindowDimensions();
  const size = Math.min(68, (width - layout.screenPadding * 2 - PER_ROW * 20) / PER_ROW);
  const rows = [AVATAR_IDS.slice(0, PER_ROW), AVATAR_IDS.slice(PER_ROW)];
  return (
    <OnboardingStep
      step={1}
      total={3}
      title="Pick your mask"
      subtitle="Your face on the Dojo Board and across every duel."
      actionLabel="Continue"
      onAction={() => navigation.navigate('Topics')}
    >
      <View accessibilityRole="radiogroup" style={styles.rack}>
        {rows.map((row, r) => (
          <View key={r} style={styles.shelf}>
            <View style={styles.rail}>
              {row.map((id) => (
                <View key={id} style={styles.peg} />
              ))}
            </View>
            <View style={styles.row}>
              {row.map((id) => (
                <HangingMask
                  key={id}
                  id={id}
                  size={size}
                  on={id === avatarId}
                  onPress={() => setAvatar(id)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      {avatarId ? (
        <AppText variant="title" style={styles.name} accessibilityLiveRegion="polite">
          {NAMES[avatarId]}
        </AppText>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  rack: { gap: spacing.xl },
  shelf: { gap: 0 },
  rail: {
    height: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.wood,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  peg: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tatami },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  slot: { alignItems: 'center' },
  cord: { width: 2, height: 10, backgroundColor: colors.muted },
  seal: { width: 10, height: 10, marginTop: spacing.sm, borderRadius: 2 },
  sealOn: { backgroundColor: colors.seal, transform: [{ rotate: '-6deg' }] },
  name: { textAlign: 'center', marginTop: spacing.lg },
});

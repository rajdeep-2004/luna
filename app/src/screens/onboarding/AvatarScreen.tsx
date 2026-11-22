import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';
import { AVATAR_IDS } from '@luna/shared';
import { YokaiAvatar } from '../../components';
import type { OnboardingStackParams } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboarding';
import { colors, spacing } from '../../theme';
import { OnboardingStep } from './OnboardingStep';

export function AvatarScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParams, 'Avatar'>) {
  const { avatarId, setAvatar } = useOnboardingStore();
  return (
    <OnboardingStep
      step={1}
      total={3}
      title="Pick your yokai"
      subtitle="This is your face on the Dojo Board and in duels."
      actionLabel="Continue"
      onAction={() => navigation.navigate('Topics')}
    >
      <View style={styles.grid}>
        {AVATAR_IDS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setAvatar(id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: id === avatarId }}
            accessibilityLabel={id}
            style={[styles.cell, id === avatarId && styles.cellOn]}
          >
            <YokaiAvatar id={id} size={64} />
          </Pressable>
        ))}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'center' },
  cell: { padding: spacing.xs, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  cellOn: { borderColor: colors.moon },
});

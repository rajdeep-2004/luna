import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { EXPERIENCE_LEVELS, type ExperienceLevel } from '@luna/shared';
import { userMessage, usersApi } from '../../api';
import { deviceTimezone } from '../../lib/timezone';
import type { OnboardingStackParams } from '../../navigation/types';
import { useAuthStore } from '../../store/auth';
import { useOnboardingStore } from '../../store/onboarding';
import { ChoiceRow } from './ChoiceRow';
import { OnboardingStep } from './OnboardingStep';

const COPY: Record<ExperienceLevel, { title: string; description: string }> = {
  beginner: { title: 'Beginner', description: 'I am learning the basics.' },
  intermediate: { title: 'Intermediate', description: 'I have built a few projects.' },
  advanced: { title: 'Advanced', description: 'I have worked on production systems.' },
};

export function LevelScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParams, 'Level'>) {
  const { avatarId, topics, level, setLevel, reset } = useOnboardingStore();
  const setUser = useAuthStore((s) => s.setUser);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (pending || !level || topics.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const user = await usersApi.updateMe({
        avatarId,
        preferredTopicSlugs: topics,
        experienceLevel: level,
        timezone: deviceTimezone(),
        completeOnboarding: true,
      });
      reset();
      setUser(user); // `onboarded` is now true, so the root navigator swaps to the main tabs.
    } catch (e) {
      setError(userMessage(e));
      setPending(false);
    }
  }

  return (
    <OnboardingStep
      step={3}
      total={3}
      title="How much experience do you have?"
      subtitle="Sets your starting difficulty. It adapts as you play."
      actionLabel="Enter the dojo"
      actionDisabled={!level}
      actionPending={pending}
      error={error}
      onAction={finish}
      onBack={() => navigation.goBack()}
    >
      {EXPERIENCE_LEVELS.map((l) => (
        <ChoiceRow
          key={l}
          kind="radio"
          title={COPY[l].title}
          description={COPY[l].description}
          selected={level === l}
          onPress={() => setLevel(l)}
        />
      ))}
    </OnboardingStep>
  );
}

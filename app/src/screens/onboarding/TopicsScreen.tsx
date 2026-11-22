import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';
import { topicsApi, userMessage } from '../../api';
import { ErrorState } from '../../components';
import type { OnboardingStackParams } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboarding';
import { colors } from '../../theme';
import { ChoiceRow } from './ChoiceRow';
import { OnboardingStep } from './OnboardingStep';

export function TopicsScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParams, 'Topics'>) {
  const { topics, toggleTopic } = useOnboardingStore();
  const query = useQuery({ queryKey: ['topics'], queryFn: topicsApi.list });

  return (
    <OnboardingStep
      step={2}
      total={3}
      title="What do you want to sharpen?"
      subtitle="Pick at least one. You can practise any topic later."
      actionLabel="Continue"
      actionDisabled={topics.length === 0}
      onAction={() => navigation.navigate('Level')}
      onBack={() => navigation.goBack()}
    >
      {query.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      {query.isError ? (
        <ErrorState
          message={userMessage(query.error)}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : null}
      {query.data?.map((t) => (
        <ChoiceRow
          key={t.slug}
          kind="checkbox"
          title={t.name}
          description={t.description}
          selected={topics.includes(t.slug)}
          onPress={() => toggleTopic(t.slug)}
        />
      ))}
    </OnboardingStep>
  );
}

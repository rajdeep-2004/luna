import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { ProgressView } from '@luna/shared';
import { userMessage } from '../../api';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  Lantern,
  ProgressLine,
  Screen,
  YokaiAvatar,
} from '../../components';
import { useProgress } from '../../lib/useProgress';
import { useTopicNames } from '../../lib/useTopicNames';
import type { AppStackParams } from '../../navigation/types';
import { useAuthStore } from '../../store/auth';
import { useOnboardingStore } from '../../store/onboarding';
import { colors, spacing } from '../../theme';
import { useStartSession } from '../explore/useStartSession';
import { FloatingMoon } from './FloatingMoon';
import { WeakestBlade } from './WeakestBlade';
import { BoardPreview } from './BoardPreview';
import { useBeginKata } from './useBeginKata';

/**
 * Home (ui-design.md §1.3): three things only. Rank and lantern, the Daily Kata with its one
 * primary button, and the weakest blade. The Checkpoint card appears only when one is ready.
 */
export function DojoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  const user = useAuthStore((s) => s.user);
  const { offerBaseline, setOfferBaseline } = useOnboardingStore();
  const progress = useProgress();
  const topicName = useTopicNames();
  const kata = useBeginKata();
  const practice = useStartSession();

  // Right after onboarding, offer the baseline once (it's skippable).
  useEffect(() => {
    if (!offerBaseline) return;
    setOfferBaseline(false);
    navigation.navigate('BaselineIntro');
  }, [offerBaseline, setOfferBaseline, navigation]);

  const p = progress.data;
  const busy = kata.pending || practice.pendingKey !== null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {user ? <YokaiAvatar id={user.avatarId} size={40} /> : null}
          <View style={styles.who}>
            <AppText color="textSoft">{user?.username}</AppText>
            {p ? (
              <AppText variant="label" color="textMuted">
                {p.level.rankName} {p.level.kanji} · Lvl {p.level.level}
              </AppText>
            ) : null}
          </View>
          <Lantern streak={p?.streak.current ?? user?.currentStreak ?? 0} />
        </View>
        {p ? <RankProgress level={p.level} /> : null}

        {progress.isPending ? <ActivityIndicator color={colors.moon} /> : null}
        {progress.isError ? (
          <ErrorState
            message={userMessage(progress.error)}
            onRetry={() => void progress.refetch()}
            retrying={progress.isFetching}
          />
        ) : null}

        {p ? (
          <>
            <View style={styles.hero}>
              <FloatingMoon phase={p.streak.doneToday ? 'full' : 'gibbous'} />
              <AppText variant="display" style={styles.centerText}>
                Daily Kata
              </AppText>
              <AppText color="textMuted" style={styles.centerText}>
                {p.streak.doneToday
                  ? 'Done for today. Your lantern stays lit.'
                  : '5 challenges · about 5 minutes'}
              </AppText>
              {p.streak.wentOut && !p.streak.doneToday ? (
                <AppText color="textSoft" style={styles.centerText}>
                  Your lantern went out. Light it again today.
                </AppText>
              ) : null}
            </View>

            <Button
              label={p.streak.doneToday ? "See today's result" : 'Begin kata'}
              variant={p.streak.doneToday ? 'ghost' : 'primary'}
              pending={kata.pending}
              disabled={busy}
              onPress={() => void kata.begin()}
            />
            {kata.error ? <Alert text={kata.error} /> : null}

            <WeakestBlade
              progress={p}
              topicName={topicName}
              busy={practice.pendingKey !== null}
              disabled={busy}
              onPractise={(slug) =>
                void practice.start(slug, { type: 'PRACTICE', topicSlug: slug })
              }
            />
            {practice.error ? <Alert text={practice.error} /> : null}

            <BoardPreview />

            {p.assessments.checkpointAvailable ? (
              <CheckpointCard
                progress={p}
                pending={practice.pendingKey === 'checkpoint'}
                disabled={busy}
                onStart={() => void practice.start('checkpoint', { type: 'CHECKPOINT' })}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function RankProgress({ level }: { level: ProgressView['level'] }) {
  if (level.nextLevelXP === null)
    return (
      <AppText variant="label" color="moon">
        {level.totalXP} XP · highest rank
      </AppText>
    );
  const span = level.nextLevelXP - level.levelStartXP;
  const into = level.totalXP - level.levelStartXP;
  return (
    <View
      style={styles.rank}
      accessible
      accessibilityLabel={`${level.nextLevelXP - level.totalXP} XP to the next rank`}
    >
      <ProgressLine value={span > 0 ? into / span : 1} />
      <AppText variant="label" color="textMuted">
        {level.totalXP} / {level.nextLevelXP} XP
      </AppText>
    </View>
  );
}

type CheckpointProps = {
  progress: ProgressView;
  pending: boolean;
  disabled: boolean;
  onStart: () => void;
};

/** benchmarks.md §1: an "after" measurement, offered every 7 Katas. No XP, so no reason to rush. */
function CheckpointCard({ progress, pending, disabled, onStart }: CheckpointProps) {
  const base = progress.assessments.baseline;
  return (
    <Card style={styles.checkpoint}>
      <AppText variant="label" color="moon">
        Checkpoint ready
      </AppText>
      <AppText>
        Five intermediate questions you haven&apos;t seen, one per topic. See how far you&apos;ve
        come.
        {base ? ` Your baseline was ${base.correct}/${base.total}.` : ''}
      </AppText>
      <Button
        label="Take the checkpoint"
        variant="ghost"
        pending={pending}
        disabled={disabled}
        onPress={onStart}
      />
    </Card>
  );
}

const Alert = ({ text }: { text: string }) => (
  <AppText color="emberSoft" accessibilityRole="alert">
    {text}
  </AppText>
);

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  who: { flex: 1, gap: spacing.xs },
  rank: { gap: spacing.xs },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  centerText: { textAlign: 'center' },
  checkpoint: { gap: spacing.sm, padding: spacing.lg },
});

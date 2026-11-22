import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { AchievementView, SessionHistoryItem, SessionType } from '@luna/shared';
import { usersApi, userMessage } from '../../api';
import { AppText, Button, Card, ErrorState, Screen, YokaiAvatar } from '../../components';
import { useProgress } from '../../lib/useProgress';
import { useTopicNames } from '../../lib/useTopicNames';
import { useAuthStore } from '../../store/auth';
import { colors, spacing } from '../../theme';

const TYPE_LABEL: Record<SessionType, string> = {
  PRACTICE: 'Practice',
  INCIDENT: 'Incident Room',
  BASELINE: 'Baseline',
  DAILY: 'Daily Kata',
  CHECKPOINT: 'Checkpoint',
  DUEL: 'Duel',
};
const GRADE_WORD = { KANPEKI: 'Kanpeki', SUGOI: 'Sugoi', YOSHI: 'Yoshi', MADA_MADA: 'Mada mada' };

/** ui-design.md §5 Profile: rank, XP, stats, achievements, history, log out. */
export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const progress = useProgress();
  const achievements = useQuery({ queryKey: ['achievements'], queryFn: usersApi.achievements });
  const history = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) => usersApi.sessions(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const refetchAchievements = achievements.refetch;
  const refetchHistory = history.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchAchievements();
      void refetchHistory();
    }, [refetchAchievements, refetchHistory]),
  );
  const p = progress.data;
  const items = history.data?.pages.flatMap((pg) => pg.items) ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {user ? <YokaiAvatar id={user.avatarId} size={72} /> : null}
          <AppText variant="title">{user?.username}</AppText>
          {p ? (
            <AppText variant="label" color="moon">
              {p.level.rankName} {p.level.kanji} · Lvl {p.level.level}
            </AppText>
          ) : null}
        </View>

        {p ? (
          <View style={styles.stats}>
            <Stat label="Total XP" value={String(p.level.totalXP)} />
            <Stat label="Streak" value={`${p.streak.current}d`} />
            <Stat label="Best streak" value={`${p.streak.longest}d`} />
          </View>
        ) : progress.isPending ? (
          <ActivityIndicator color={colors.moon} />
        ) : null}

        <Section title="Achievements">
          {achievements.isError ? (
            <ErrorState
              message={userMessage(achievements.error)}
              onRetry={() => void achievements.refetch()}
              retrying={achievements.isFetching}
            />
          ) : null}
          {achievements.data?.map((a) => (
            <Achievement key={a.key} a={a} />
          ))}
        </Section>

        <Section title="History">
          {history.isError ? (
            <ErrorState
              message={userMessage(history.error)}
              onRetry={() => void history.refetch()}
              retrying={history.isFetching}
            />
          ) : null}
          {history.data && items.length === 0 ? (
            <AppText color="textMuted">Finished sessions appear here.</AppText>
          ) : null}
          {items.map((s) => (
            <HistoryRow key={s.id} s={s} />
          ))}
          {history.hasNextPage ? (
            <Button
              label="Show more"
              variant="ghost"
              pending={history.isFetchingNextPage}
              onPress={() => void history.fetchNextPage()}
            />
          ) : null}
        </Section>

        <Button label="Log out" variant="ghost" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <AppText variant="label" color="textMuted">
        {title}
      </AppText>
      {children}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="label" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

/** Locked ones are dimmed and show their condition (progression.md §7). */
function Achievement({ a }: { a: AchievementView }) {
  const earned = a.awardedAt !== null;
  return (
    <View
      style={[styles.ach, !earned && styles.locked]}
      accessible
      accessibilityLabel={`${a.name}, ${earned ? 'earned' : `locked: ${a.condition}`}`}
    >
      <AppText style={styles.icon}>{a.icon}</AppText>
      <View style={styles.achBody}>
        <AppText color={earned ? 'moon' : 'textSoft'}>{a.name}</AppText>
        <AppText variant="label" color="textMuted">
          {earned ? `Earned ${new Date(a.awardedAt!).toLocaleDateString()}` : a.condition}
        </AppText>
      </View>
    </View>
  );
}

function HistoryRow({ s }: { s: SessionHistoryItem }) {
  const topicName = useTopicNames();
  const title = s.topicSlug
    ? `${TYPE_LABEL[s.type]} · ${topicName(s.topicSlug)}`
    : TYPE_LABEL[s.type];
  return (
    <View style={styles.hist}>
      <View style={styles.achBody}>
        <AppText color="textSoft">{title}</AppText>
        <AppText variant="label" color="textMuted">
          {new Date(s.completedAt).toLocaleDateString()} · {GRADE_WORD[s.grade]}
        </AppText>
      </View>
      <AppText variant="code" color="textSoft">
        {s.correctAnswers}/{s.totalAnswers} · +{s.xpEarned}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: spacing.xs },
  ach: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  locked: { opacity: 0.6 },
  icon: { fontSize: 24, lineHeight: 30 },
  achBody: { flex: 1, gap: 2 },
  hist: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});

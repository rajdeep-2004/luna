import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { AvatarId, ProgressView, SessionHistoryItem, SessionType } from '@luna/shared';
import { usersApi, userMessage } from '../../api';
import { Crest, Trophy, type TrophyKind } from '../../art/Crest';
import { Enso } from '../../art/Enso';
import { HankoStamp } from '../../art/HankoStamp';
import { Kanji, toGlyphs } from '../../art/Kanji';
import { YokaiMask } from '../../art/YokaiMask';
import { AppText, Button, ErrorState, Screen } from '../../components';
import { rankProgress } from '../../lib/rank';
import { useProgress } from '../../lib/useProgress';
import { useTopicNames } from '../../lib/useTopicNames';
import { useAuthStore } from '../../store/auth';
import { colors, layout, spacing } from '../../theme';
import { useWeeklyRank } from '../dojo/useWeeklyRank';

const TYPE_LABEL: Record<SessionType, string> = {
  PRACTICE: 'Practice',
  INCIDENT: 'Incident Room',
  BASELINE: 'Baseline',
  DAILY: 'Daily Kata',
  CHECKPOINT: 'Checkpoint',
  DUEL: 'Duel',
};
const GRADE_WORD = { KANPEKI: 'Kanpeki', SUGOI: 'Sugoi', YOSHI: 'Yoshi', MADA_MADA: 'Mada mada' };

/**
 * Profile (DESIGN.md: "the warrior, not the report card"): the mask on a banner, the rank kanji in
 * its ensō, four trophies (streak, duel record, katas, weekly place), achievement crests, and
 * recent runs stamped like a scroll. No topic accuracy (D-037).
 */
export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const progress = useProgress();
  const weekly = useWeeklyRank();
  const { width } = useWindowDimensions();
  const achievements = useQuery({ queryKey: ['achievements'], queryFn: usersApi.achievements });
  const history = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) => usersApi.sessions(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const refetchAchievements = achievements.refetch;
  const refetchHistory = history.refetch;
  const refetchProgress = progress.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchAchievements();
      void refetchHistory();
      void refetchProgress();
    }, [refetchAchievements, refetchHistory, refetchProgress]),
  );
  const p = progress.data;
  // `stats` arrived with P7; an older server leaves it out.
  const stats = p?.stats ?? { katasCompleted: 0, duelsWon: 0, duelsLost: 0, duelsDrawn: 0 };
  const items = history.data?.pages.flatMap((pg) => pg.items) ?? [];

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {p && user ? (
          <Banner p={p} username={user.username} avatarId={user.avatarId} width={width} />
        ) : progress.isPending ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : progress.isError ? (
          <View style={styles.inner}>
            <ErrorState
              message={userMessage(progress.error)}
              onRetry={() => void progress.refetch()}
              retrying={progress.isFetching}
            />
          </View>
        ) : null}

        {p ? (
          <View style={styles.trophies}>
            <TrophyStat
              kind="streak"
              value={String(p.streak.current)}
              label="day streak"
              a11y={`${p.streak.current} day streak, best ${p.streak.longest}`}
            />
            <TrophyStat
              kind="duels"
              value={`${stats.duelsWon}–${stats.duelsLost}`}
              label="duels"
              a11y={`Duels: ${stats.duelsWon} won, ${stats.duelsLost} lost, ${stats.duelsDrawn} drawn`}
            />
            <TrophyStat
              kind="katas"
              value={String(stats.katasCompleted)}
              label="katas"
              a11y={`${stats.katasCompleted} Daily Katas completed`}
            />
            <TrophyStat
              kind="week"
              value={weekly.rank ? `#${weekly.rank}` : '–'}
              label="this week"
              a11y={weekly.rank ? `Number ${weekly.rank} this week` : 'Not on the board this week'}
            />
          </View>
        ) : null}

        <View style={styles.inner}>
          <AppText variant="title" style={styles.h4}>
            Crests
          </AppText>
          {achievements.isError ? (
            <ErrorState
              message={userMessage(achievements.error)}
              onRetry={() => void achievements.refetch()}
              retrying={achievements.isFetching}
            />
          ) : null}
          <View style={styles.crests}>
            {achievements.data?.map((a) => {
              const earned = a.awardedAt !== null;
              return (
                <View
                  key={a.key}
                  accessible
                  accessibilityLabel={`${a.name}, ${earned ? 'earned' : `locked: ${a.condition}`}`}
                  style={styles.crest}
                >
                  <Crest id={a.key} earned={earned} size={54} />
                  <AppText
                    variant="label"
                    color={earned ? 'text' : 'muted'}
                    style={styles.crestName}
                    numberOfLines={2}
                  >
                    {a.name}
                  </AppText>
                </View>
              );
            })}
          </View>

          <AppText variant="title" style={styles.h4}>
            Recent
          </AppText>
          {history.isError ? (
            <ErrorState
              message={userMessage(history.error)}
              onRetry={() => void history.refetch()}
              retrying={history.isFetching}
            />
          ) : null}
          {history.data && items.length === 0 ? (
            <AppText color="muted">Your runs appear here, stamped.</AppText>
          ) : null}
          {items.map((s) => (
            <RunRow key={s.id} s={s} />
          ))}
          {history.hasNextPage ? (
            <Button
              label="Show more"
              variant="ghost"
              pending={history.isFetchingNextPage}
              onPress={() => void history.fetchNextPage()}
            />
          ) : null}

          <View style={styles.logout}>
            <Button label="Log out" variant="ghost" onPress={() => void signOut()} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

type BannerProps = { p: ProgressView; username: string; avatarId: AvatarId; width: number };

/** The warrior's banner: a vermilion nobori with the mask, the rank kanji inside its ensō. */
function Banner({ p, username, avatarId, width }: BannerProps) {
  const s = width / 390;
  const H = 250;
  const glyphs = toGlyphs(p.level.kanji);
  const ensoSize = 128 * s;
  const glyph = (glyphs.length > 1 ? 44 : 70) * s;
  const toNext = p.level.nextLevelXP === null ? null : p.level.nextLevelXP - p.level.totalXP;
  return (
    <View
      style={{ width, height: H * s }}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${p.level.rankName}, level ${p.level.level}. ${p.level.totalXP} XP${
        toNext === null ? ', highest rank' : `, ${toNext} to the next rank`
      }.`}
    >
      <Svg width={width} height={H * s} viewBox={`0 0 390 ${H}`} style={StyleSheet.absoluteFill}>
        <Rect width={390} height={H} fill={colors.ground} />
        <Path d="M30 0 L150 0 L150 236 L90 210 L30 236 Z" fill={colors.seal} />
      </Svg>
      <View style={[styles.abs, { left: 90 * s - 52 * s, top: 112 * s - 52 * s }]}>
        <YokaiMask id={avatarId} size={104 * s} />
      </View>
      <View
        style={[
          styles.abs,
          styles.center,
          {
            left: 268 * s - ensoSize / 2,
            top: 84 * s - ensoSize / 2,
            width: ensoSize,
            height: ensoSize,
          },
        ]}
      >
        <View style={StyleSheet.absoluteFill}>
          <Enso progress={rankProgress(p.level)} size={ensoSize} color="primary" thickness={0.07} />
        </View>
        <View style={styles.row}>
          {glyphs.map((g, i) => (
            <Kanji key={`${g}${i}`} glyph={g} size={glyph} color="text" />
          ))}
        </View>
      </View>
      <View style={[styles.abs, { left: 186 * s, top: 160 * s, right: 12 }]}>
        <AppText variant="display" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {p.level.rankName}
        </AppText>
        <AppText color="muted" style={styles.semi} numberOfLines={1}>
          @{username} · Lvl {p.level.level}
        </AppText>
        <AppText color="primary" style={styles.bold} numberOfLines={1}>
          {p.level.totalXP} XP{toNext === null ? ' · top rank' : ` · ${toNext} to next rank`}
        </AppText>
      </View>
    </View>
  );
}

function TrophyStat(props: { kind: TrophyKind; value: string; label: string; a11y: string }) {
  return (
    <View style={styles.trophy} accessible accessibilityLabel={props.a11y}>
      <Trophy kind={props.kind} />
      <AppText variant="title" style={styles.trophyValue}>
        {props.value}
      </AppText>
      <AppText variant="label" color="muted">
        {props.label}
      </AppText>
    </View>
  );
}

/** One run, stamped: 正 for a passing grade, 誤 in grey for "mada mada". */
function RunRow({ s }: { s: SessionHistoryItem }) {
  const topicName = useTopicNames();
  const title = s.topicSlug
    ? `${TYPE_LABEL[s.type]} · ${topicName(s.topicSlug)}`
    : TYPE_LABEL[s.type];
  const passed = s.grade !== 'MADA_MADA';
  return (
    <View
      style={styles.run}
      accessible
      accessibilityLabel={`${title}: ${GRADE_WORD[s.grade]}, ${s.correctAnswers} of ${s.totalAnswers}, ${s.xpEarned} XP`}
    >
      <HankoStamp glyph={passed ? '正' : '誤'} size={30} tone={passed ? 'seal' : 'ink'} />
      <View style={styles.runBody}>
        <AppText style={styles.semi} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="label" color="muted">
          {GRADE_WORD[s.grade]} · {s.correctAnswers} / {s.totalAnswers}
        </AppText>
      </View>
      <AppText variant="title" color="primary" style={styles.runXp}>
        +{s.xpEarned}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  loading: { marginTop: spacing.giant },
  inner: { paddingHorizontal: layout.screenPadding, gap: spacing.md },
  abs: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  semi: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  trophies: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  trophy: { flex: 1, alignItems: 'center', gap: 2 },
  trophyValue: { fontSize: 20, lineHeight: 26 },
  h4: { fontSize: 18, lineHeight: 24, marginTop: spacing.sm },
  crests: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  crest: { width: 60, alignItems: 'center', gap: 4 },
  crestName: { fontSize: 10, lineHeight: 12, textAlign: 'center' },
  run: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(179,154,120,0.18)',
  },
  runBody: { flex: 1, gap: 2 },
  runXp: { fontSize: 16, lineHeight: 20 },
  logout: { marginTop: spacing.xl },
});

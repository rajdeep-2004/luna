import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { PracticeMode, TopicSlug } from '@luna/shared';
import { topicsApi, userMessage } from '../../api';
import { BossStage, ModeArt } from '../../art/ModeArt';
import { TopicBanner } from '../../art/TopicBanner';
import { AppText, EmptyState, ErrorState, PressableSink, Screen } from '../../components';
import { useReduceMotion } from '../../lib/motion';
import { colors, layout, radii, spacing } from '../../theme';
import { useStartSession } from './useStartSession';

/** Short names that fit under a banner (the full name shows above the modes). */
const SHORT: Record<TopicSlug, string> = {
  'js-async': 'JS &\nAsync',
  'http-apis': 'HTTP &\nAPIs',
  databases: 'Data-\nbases',
  'caching-queues': 'Caching &\nQueues',
  'debugging-prod': 'Debug\nProd',
};

const MODES: { mode: PracticeMode; name: string; ask: string; time: string }[] = [
  { mode: 'TRACE', name: 'Trace the Stack', ask: 'What does it print?', time: '2 min' },
  { mode: 'BUG_HUNT', name: 'Bug Hunt', ask: 'Tap the broken line.', time: '2 min' },
  {
    mode: 'ENGINEER_CHOICE',
    name: "Engineer's Choice",
    ask: 'Pick the better path.',
    time: '3 min',
  },
];

const BANNER_GAP = 10;

/**
 * Explore (DESIGN.md, D-037): pick a banner, then pick a game. Topics hang as nobori banners; the
 * chosen topic lists its game modes, each with its own art, and its boss, the Incident Room.
 * A mode round is that topic's challenges of one kind, topped up from other topics (D-041).
 */
export function ExploreScreen() {
  const topics = useQuery({ queryKey: ['topics'], queryFn: topicsApi.list });
  const { start, pendingKey, error } = useStartSession();
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const [picked, setPicked] = useState<TopicSlug | null>(null);
  const list = topics.data ?? [];
  const topic = list.find((t) => t.slug === picked) ?? list[0];
  const inner = width - layout.screenPadding * 2;
  const bannerW = Math.min(
    66,
    (inner - BANNER_GAP * (Math.max(list.length, 5) - 1)) / Math.max(list.length, 5),
  );
  const busy = pendingKey !== null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="display">Explore</AppText>

        {topics.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        {topics.isError ? (
          <ErrorState
            message={userMessage(topics.error)}
            onRetry={() => void topics.refetch()}
            retrying={topics.isFetching}
          />
        ) : null}
        {topics.data?.length === 0 ? <EmptyState title="No topics yet" /> : null}

        {topic ? (
          <>
            <View style={styles.banners} accessibilityRole="tablist">
              {list.map((t) => (
                <Banner
                  key={t.slug}
                  slug={t.slug}
                  label={SHORT[t.slug] ?? t.name}
                  fullName={t.name}
                  width={bannerW}
                  on={t.slug === topic.slug}
                  onPress={() => setPicked(t.slug)}
                />
              ))}
            </View>

            <View key={topic.slug} style={styles.modes}>
              <Animated.View entering={reduce ? undefined : FadeInDown.duration(260)}>
                <AppText variant="title">{topic.name}</AppText>
                <AppText color="muted">How do you want to play?</AppText>
              </Animated.View>

              {MODES.map((m, i) => {
                const key = `${topic.slug}:${m.mode}`;
                return (
                  <Animated.View
                    key={m.mode}
                    entering={reduce ? undefined : FadeInDown.duration(280).delay(60 + i * 60)}
                  >
                    <PressableSink
                      style={[styles.mode, busy && pendingKey !== key && styles.dim]}
                      disabled={busy}
                      onPress={() =>
                        void start(key, { type: 'PRACTICE', topicSlug: topic.slug, mode: m.mode })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${m.name}. ${m.ask} About ${m.time}. Five rounds of ${topic.name}.`}
                      accessibilityState={{ busy: pendingKey === key, disabled: busy }}
                    >
                      <ModeArt mode={m.mode} />
                      <View style={styles.modeText}>
                        <AppText variant="title" style={styles.modeName}>
                          {m.name}
                        </AppText>
                        <AppText color="muted">{m.ask}</AppText>
                      </View>
                      {pendingKey === key ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <AppText variant="code" color="muted">
                          {m.time}
                        </AppText>
                      )}
                    </PressableSink>
                  </Animated.View>
                );
              })}

              <Animated.View entering={reduce ? undefined : FadeInDown.duration(320).delay(260)}>
                <PressableSink
                  style={[styles.boss, busy && pendingKey !== 'boss' && styles.dim]}
                  disabled={busy}
                  onPress={() => void start('boss', { type: 'INCIDENT', topicSlug: topic.slug })}
                  accessibilityRole="button"
                  accessibilityLabel={`Boss: Incident Room for ${topic.name}. A live production problem in three stages.`}
                  accessibilityState={{ busy: pendingKey === 'boss', disabled: busy }}
                >
                  <View style={styles.bossArt}>
                    <BossStage width={inner} />
                  </View>
                  <View style={styles.bossText}>
                    <AppText variant="label" color="shoji">
                      BOSS · 3 STAGES
                    </AppText>
                    <AppText variant="title">Incident Room</AppText>
                  </View>
                  {pendingKey === 'boss' ? (
                    <ActivityIndicator color={colors.primary} style={styles.bossSpin} />
                  ) : null}
                </PressableSink>
              </Animated.View>
            </View>
          </>
        ) : null}

        {error ? (
          <AppText color="primary" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

type BannerProps = {
  slug: TopicSlug;
  label: string;
  fullName: string;
  width: number;
  on: boolean;
  onPress: () => void;
};

/** One hanging banner. The chosen one lifts 6 pt, as if its cord was pulled. */
function Banner({ slug, label, fullName, width, on, onPress }: BannerProps) {
  const reduce = useReduceMotion();
  const lift = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lift.value = reduce ? (on ? 1 : 0) : withSpring(on ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [on, reduce, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * lift.value }] }));
  return (
    <PressableSink
      onPress={onPress}
      style={[styles.banner, { width }]}
      accessibilityRole="tab"
      accessibilityLabel={fullName}
      accessibilityState={{ selected: on }}
    >
      <Animated.View style={style}>
        <TopicBanner slug={slug} width={width} />
      </Animated.View>
      <AppText variant="label" color={on ? 'text' : 'muted'} style={styles.bannerLabel}>
        {label}
      </AppText>
    </PressableSink>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.xl },
  banners: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: BANNER_GAP,
    paddingTop: spacing.sm,
  },
  banner: { alignItems: 'center', gap: spacing.sm },
  bannerLabel: { textAlign: 'center', fontSize: 11, lineHeight: 13 },
  modes: { gap: spacing.xs },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: layout.touchTarget,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(179,154,120,0.18)',
  },
  modeText: { flex: 1, gap: 2 },
  modeName: { fontSize: 18, lineHeight: 24 },
  boss: {
    marginTop: spacing.lg,
    height: 128,
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: spacing.lg,
    backgroundColor: colors.night,
  },
  bossArt: { position: 'absolute', top: 0, right: 0, left: 0, bottom: 0 },
  bossText: { gap: 2 },
  bossSpin: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  dim: { opacity: 0.5 },
});

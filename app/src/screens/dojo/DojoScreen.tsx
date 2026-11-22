import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProgressView } from '@luna/shared';
import { userMessage } from '../../api';
import { DojoScene } from '../../art/DojoScene';
import { EmaPlaque } from '../../art/EmaPlaque';
import { KataScroll } from '../../art/KataScroll';
import { toGlyphs } from '../../art/Kanji';
import { Lantern, type LanternState } from '../../art/Lantern';
import { Letter } from '../../art/Letter';
import { MaskStand } from '../../art/MaskStand';
import { RankScroll } from '../../art/RankScroll';
import { DOJO, DOJO_ANCHORS } from '../../art/scene';
import { AppText, Button, ErrorState, PressableSink } from '../../components';
import { useReduceMotion } from '../../lib/motion';
import { useProgress } from '../../lib/useProgress';
import type { AppStackParams, MainTabParams } from '../../navigation/types';
import { useAuthStore } from '../../store/auth';
import { useDojoMoments } from '../../store/dojo';
import { useOnboardingStore } from '../../store/onboarding';
import { colors, layout, spacing } from '../../theme';
import { useStartSession } from '../explore/useStartSession';
import { ComingHome } from './ComingHome';
import { useBeginKata } from './useBeginKata';
import { useWeeklyRank } from './useWeeklyRank';

type Nav = NavigationProp<AppStackParams & MainTabParams>;

const KATA = { w: 192, h: 40 };
const LETTER = { x: 214, y: 268, w: 60 };

function lanternState(p: ProgressView): LanternState {
  if (p.streak.current === 0) return 'out';
  return p.streak.doneToday ? 'lit' : 'waiting';
}

function rankProgress(level: ProgressView['level']): number {
  if (level.nextLevelXP === null) return 1;
  const span = level.nextLevelXP - level.levelStartXP;
  return span > 0 ? (level.totalXP - level.levelStartXP) / span : 1;
}

/** 0..1 through the local day: the moon's place on its arc, heading for the kata reset at midnight. */
function dayProgress(now = new Date()): number {
  return (now.getHours() * 60 + now.getMinutes()) / 1440;
}

/** Fits the 390-wide room to the space between the status bar and the tab bar (DESIGN.md: Layout). */
function useRoomFrame() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBar = useBottomTabBarHeight();
  const avail = height - insets.top - tabBar;
  let scale = width / layout.sceneWidth;
  let gridH = avail / scale;
  // Too short for the floor to hold the table: shrink the whole room instead.
  if (gridH < DOJO.minHeight) {
    scale = avail / DOJO.minHeight;
    gridH = DOJO.minHeight;
  }
  gridH = Math.min(gridH, DOJO.height);
  return { scale, gridH, roomW: layout.sceneWidth * scale, top: insets.top };
}

/** While progress loads, the lantern breathes (DESIGN.md: Components, states). */
function Breathing({ children }: { children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.value = withRepeat(
      withSequence(withTiming(0.55, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
    );
  }, [reduce, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Home is the player's den (DESIGN.md: Kiri-e Den): the objects in the room are the controls.
 * Lantern = streak, scroll = rank and XP ensō, ema = this week's place, the sealed scroll on the table
 * = today's kata, a letter under the shoji = a Checkpoint is ready, the resting mask = you.
 */
export function DojoScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const { offerBaseline, setOfferBaseline } = useOnboardingStore();
  const progress = useProgress();
  const weekly = useWeeklyRank();
  const kata = useBeginKata();
  const checkpoint = useStartSession();
  const { homecomingPlayed, markHomecoming, seenStreak, setSeenStreak } = useDojoMoments();
  const [relightKey, setRelightKey] = useState<number | null>(null);
  const { scale, gridH, roomW, top } = useRoomFrame();
  const u = (n: number) => n * scale;

  useEffect(() => {
    if (!offerBaseline) return;
    setOfferBaseline(false);
    navigation.navigate('BaselineIntro');
  }, [offerBaseline, setOfferBaseline, navigation]);

  const p = progress.data;
  // Relight only when the streak grew since this launch last showed it.
  useEffect(() => {
    if (!p) return;
    const now = p.streak.current;
    if (seenStreak !== null && now > seenStreak) setRelightKey(now);
    if (seenStreak !== now) setSeenStreak(now);
  }, [p, seenStreak, setSeenStreak]);

  const onHomeDone = useCallback(() => markHomecoming(), [markHomecoming]);
  const busy = kata.pending || checkpoint.pendingKey !== null;
  const done = p?.streak.doneToday ?? false;
  const streak = p?.streak.current ?? user?.currentStreak ?? 0;
  const tableTop = gridH - DOJO.tableFromBottom;
  const at = (a: { x: number; y: number }) => ({ left: u(a.x), top: u(a.y) });

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      <View style={[styles.room, { width: roomW, height: u(gridH) }]}>
        <DojoScene width={roomW} gridHeight={gridH} dayProgress={dayProgress()} />

        {p ? (
          <PressableSink
            style={[styles.abs, at(DOJO_ANCHORS.scroll)]}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel={`Rank: ${p.level.rankName}, level ${p.level.level}. ${
              p.level.nextLevelXP === null
                ? 'Highest rank.'
                : `${p.level.nextLevelXP - p.level.totalXP} XP to the next rank.`
            } Opens your profile.`}
          >
            <RankScroll
              glyphs={toGlyphs(p.level.kanji)}
              rankName={p.level.rankName}
              level={p.level.level}
              progress={rankProgress(p.level)}
              width={u(DOJO_ANCHORS.scroll.w)}
            />
          </PressableSink>
        ) : null}

        <PressableSink
          style={[styles.abs, at(DOJO_ANCHORS.lantern)]}
          onPress={() => navigation.navigate('Profile')}
          disabled={!p}
          accessibilityRole="button"
          accessibilityLabel={`Streak: ${streak} ${streak === 1 ? 'day' : 'days'}. Lantern${
            done ? ' lit for today' : ''
          }.`}
        >
          {p ? (
            <Lantern
              streak={streak}
              state={lanternState(p)}
              width={u(DOJO_ANCHORS.lantern.w)}
              relightKey={relightKey}
            />
          ) : (
            <Breathing>
              <Lantern
                streak={streak}
                state="waiting"
                width={u(DOJO_ANCHORS.lantern.w)}
                showCaption={false}
              />
            </Breathing>
          )}
        </PressableSink>

        {user ? (
          <PressableSink
            style={[styles.abs, at(DOJO_ANCHORS.mask)]}
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel={`Your ${user.avatarId} mask, resting. Opens your profile.`}
          >
            <MaskStand avatarId={user.avatarId} width={u(DOJO_ANCHORS.mask.w)} />
          </PressableSink>
        ) : null}

        <PressableSink
          style={[styles.abs, at(DOJO_ANCHORS.ema)]}
          onPress={() => navigation.navigate('DojoBoard')}
          accessibilityRole="button"
          accessibilityLabel={
            weekly.rank
              ? `Dojo Board: number ${weekly.rank} this week.`
              : 'Dojo Board: not on it yet this week.'
          }
        >
          <EmaPlaque rank={weekly.rank} width={u(DOJO_ANCHORS.ema.w)} />
        </PressableSink>

        {p?.assessments.checkpointAvailable ? (
          <PressableSink
            style={[styles.abs, at(LETTER)]}
            disabled={busy}
            onPress={() => void checkpoint.start('checkpoint', { type: 'CHECKPOINT' })}
            accessibilityRole="button"
            accessibilityLabel="A letter: your Checkpoint is ready. Five unseen questions, one per topic."
          >
            <Letter width={u(LETTER.w)} />
          </PressableSink>
        ) : null}

        <PressableSink
          style={[
            styles.abs,
            { left: u((layout.sceneWidth - KATA.w) / 2), top: u(tableTop - KATA.h + 4) },
          ]}
          disabled={busy || !p}
          onPress={() => void kata.begin()}
          accessibilityRole="button"
          accessibilityLabel={
            done
              ? "Today's kata scroll, stamped. See today's result."
              : "Today's kata scroll, sealed. Begin kata."
          }
        >
          <KataScroll state={done ? 'done' : 'sealed'} width={u(KATA.w)} />
        </PressableSink>

        <View style={[styles.actions, { bottom: u(22), left: u(22), right: u(22) }]}>
          {progress.isError ? (
            <ErrorState
              message={userMessage(progress.error)}
              onRetry={() => void progress.refetch()}
              retrying={progress.isFetching}
            />
          ) : null}
          {kata.error || checkpoint.error ? (
            <AppText color="primary" accessibilityRole="alert" style={styles.alert}>
              {kata.error ?? checkpoint.error}
            </AppText>
          ) : null}
          <Button
            label={done ? "Today's result" : 'Begin kata'}
            variant={done ? 'ghost' : 'primary'}
            pending={kata.pending}
            disabled={busy || !p}
            onPress={() => void kata.begin()}
          />
        </View>
      </View>
      {!homecomingPlayed ? <ComingHome onDone={onHomeDone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  room: { position: 'relative', overflow: 'hidden' },
  abs: { position: 'absolute' },
  actions: { position: 'absolute', gap: spacing.sm },
  alert: { textAlign: 'center' },
});

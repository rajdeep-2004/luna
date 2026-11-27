import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import {
  ENDED_PHASES,
  LIVE_DUEL,
  PREGAME_PHASES,
  type DuelPhase,
  type DuelSnapshot,
} from '@luna/shared';
import { duelsApi, userMessage } from '../../api';
import { AppText, Button, ErrorState, Screen } from '../../components';
import { config } from '../../config/env';
import { haptic } from '../../lib/haptics';
import type { AppStackParams } from '../../navigation/types';
import { useLiveDuel } from '../../store/liveDuel';
import { colors, layout, spacing } from '../../theme';
import { FaceOffStage } from './live/FaceOffStage';
import { LiveBanners, SupersededPanel } from './live/LiveBanners';
import { LobbyStage } from './live/LobbyStage';
import { PlayStage } from './live/PlayStage';
import { DUELS_KEY, duelKey } from './useDuelActions';

type Props = NativeStackScreenProps<AppStackParams, 'LiveDuel'>;

const isIn = (p: DuelPhase, list: readonly DuelPhase[]) => list.includes(p);

/** What leaving means right now, for the confirm dialog. */
function leaveCopy(duel: DuelSnapshot): { title: string; body: string; confirm: string } {
  if (isIn(duel.phase, PREGAME_PHASES)) {
    return duel.role === 'CREATOR'
      ? { title: 'Cancel the duel?', body: 'The code stops working.', confirm: 'Cancel duel' }
      : { title: 'Leave the duel?', body: 'Your rival can invite someone else.', confirm: 'Leave' };
  }
  return {
    title: 'Forfeit the duel?',
    body: 'Leaving now gives your rival the win.',
    confirm: 'Forfeit',
  };
}

/**
 * The live duel (P14, D-053): one screen for the whole match, drawn from the server's snapshot.
 * LOBBY (nobody joined) → the lobby with the code; READY and COUNTDOWN → the face-off; QUESTION and
 * REVEAL → play. When the match ends it hands over to the result screen. Leaving by any route (the
 * ✕, Back, a swipe) asks first, because leaving cancels the lobby or forfeits the match.
 */
export function LiveDuelScreen({ route, navigation }: Props) {
  const { duelId } = route.params;
  const queryClient = useQueryClient();
  const live = useLiveDuel();
  const duel = live.snapshot;
  const [leaving, setLeaving] = useState(false);
  /** Set once leaving is decided, so the `beforeRemove` guard lets the screen go. */
  const mayLeave = useRef(false);
  /** True once I asked to leave: an ending caused by me needs no "it was cancelled" page. */
  const iLeft = useRef(false);
  /** The last invite deadline seen, to tell "the invite expired" from "the duel was cancelled". */
  const lobbyEnds = useRef<string | null>(null);
  /** Navigates away exactly once: the leave ack and the server's "ended" push can both ask. */
  const gone = useRef(false);
  const exit = (go: () => void) => {
    if (gone.current) return;
    gone.current = true;
    mayLeave.current = true;
    go();
  };

  // Open the room on mount, close it on unmount. The REST snapshot from create/join seeds the
  // screen so it draws at once, before the socket has connected.
  useEffect(() => {
    const seed = queryClient.getQueryData<DuelSnapshot>(duelKey(duelId));
    useLiveDuel.getState().open(duelId, seed);
    return () => useLiveDuel.getState().close();
  }, [duelId, queryClient]);

  if (duel?.lobbyExpiresAt) lobbyEnds.current = duel.lobbyExpiresAt;
  const phase = duel?.phase ?? null;
  const ended = phase !== null && isIn(phase, ENDED_PHASES);

  // A finished match goes to the result page after a beat; the snapshot seeds it.
  useEffect(() => {
    if (!duel || !ended) return;
    void queryClient.invalidateQueries({ queryKey: DUELS_KEY });
    if (iLeft.current && duel.phase === 'CANCELLED') return exit(() => navigation.goBack());
    if (duel.phase !== 'COMPLETED' && duel.phase !== 'ABANDONED') return;
    const t = setTimeout(() => {
      queryClient.setQueryData(duelKey(duel.id), duel);
      exit(() => navigation.replace('DuelResult', { duelId: duel.id }));
    }, config.live.toResultMs);
    return () => clearTimeout(t);
    // Only the move into an ended phase matters, not every later snapshot.
  }, [ended, duel?.phase]);

  // Leaving by Back or a swipe goes through the same confirm as the ✕.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        const s = useLiveDuel.getState();
        const d = s.snapshot;
        if (mayLeave.current || !d || isIn(d.phase, ENDED_PHASES) || s.superseded || s.fatal)
          return;
        e.preventDefault();
        confirmLeave(() => navigation.dispatch(e.data.action));
      }),
    [navigation],
  );

  function confirmLeave(then: () => void) {
    const d = useLiveDuel.getState().snapshot;
    if (!d || leaving) return;
    const copy = leaveCopy(d);
    haptic.light();
    Alert.alert(copy.title, copy.body, [
      { text: 'Stay', style: 'cancel' },
      { text: copy.confirm, style: 'destructive', onPress: () => void leave(d, then) },
    ]);
  }

  async function leave(d: DuelSnapshot, then: () => void) {
    setLeaving(true);
    iLeft.current = true;
    let failed = await useLiveDuel.getState().leave();
    // The creator can always cancel a lobby over REST, even with the socket down.
    if (failed && d.role === 'CREATOR' && isIn(d.phase, PREGAME_PHASES)) {
      failed = await duelsApi.cancel(d.id).then(
        () => null,
        (e: unknown) => ({ code: 'REST', message: userMessage(e) }),
      );
    }
    setLeaving(false);
    void queryClient.invalidateQueries({ queryKey: DUELS_KEY });
    if (failed && isIn(d.phase, PREGAME_PHASES)) {
      iLeft.current = false;
      Alert.alert('Could not leave', failed.message);
      return;
    }
    // In a match, a failed leave still leaves: the server forfeits an empty seat after the grace.
    if (isIn(d.phase, PREGAME_PHASES)) exit(then);
    else exit(() => navigation.replace('DuelResult', { duelId: d.id }));
  }

  const back = () => navigation.goBack();
  const goBack = () => exit(back);

  let stage: React.ReactNode;
  if (live.fatal) {
    stage = (
      <Centered>
        <ErrorState message={live.fatal.message} />
        <Button label="Back" variant="ghost" onPress={goBack} />
      </Centered>
    );
  } else if (!duel) {
    stage = (
      <Centered>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Opening the duel" />
      </Centered>
    );
  } else if (duel.phase === 'CANCELLED') {
    const expired =
      !duel.rival &&
      !!lobbyEnds.current &&
      Date.parse(lobbyEnds.current) <= Date.now() + live.offsetMs;
    stage = (
      <ClosedPanel
        title={expired ? 'The invite expired' : 'The duel was cancelled'}
        body={
          expired
            ? `Nobody joined within ${LIVE_DUEL.lobbyTtlMs / 60_000} minutes.`
            : duel.role === 'CREATOR'
              ? 'The lobby closed before the duel began.'
              : `@${duel.rival?.username ?? 'Your rival'} called it off before the first question.`
        }
        onBack={goBack}
      />
    );
  } else if (ended) {
    stage = (
      <Centered>
        <AppText variant="title" style={styles.center} accessibilityLiveRegion="polite">
          The duel is over
        </AppText>
      </Centered>
    );
  } else if (duel.phase === 'LOBBY') {
    stage = (
      <LobbyStage
        duel={duel}
        offsetMs={live.offsetMs}
        cancelling={leaving}
        onCancel={() => confirmLeave(back)}
      />
    );
  } else if (duel.phase === 'READY' || duel.phase === 'COUNTDOWN') {
    stage = (
      <FaceOffStage
        duel={duel}
        offsetMs={live.offsetMs}
        leaving={leaving}
        onLeave={() => confirmLeave(back)}
      />
    );
  } else {
    stage = (
      <PlayStage
        key={duel.currentIndex}
        duel={duel}
        offsetMs={live.offsetMs}
        answer={live.answer}
        onLeave={() => confirmLeave(back)}
      />
    );
  }

  return (
    <Screen padded={false}>
      <LiveBanners
        duel={duel}
        conn={live.conn}
        everConnected={live.everConnected}
        connectingSince={live.connectingSince}
        lostAt={live.lostAt}
        rivalLostAt={live.rivalLostAt}
      />
      <View style={styles.stage}>{stage}</View>
      {live.superseded && !ended ? (
        <SupersededPanel onTakeSeat={live.takeSeat} onClose={goBack} />
      ) : null}
    </Screen>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

/** A lobby that closed (expired or cancelled): one line why, and the way back. */
function ClosedPanel({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <Centered>
      <AppText variant="title" style={styles.center} accessibilityLiveRegion="polite">
        {title}
      </AppText>
      <AppText color="muted" style={styles.center}>
        {body}
      </AppText>
      <Button label="Back to the dojo" onPress={onBack} />
    </Centered>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
  center: { textAlign: 'center' },
});

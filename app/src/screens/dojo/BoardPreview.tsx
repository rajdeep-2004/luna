import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { leaderboardApi } from '../../api';
import { AppText } from '../../components';
import type { AppStackParams } from '../../navigation/types';
import { colors, layout, radii, spacing } from '../../theme';
import { BOARD_KEY } from '../board/DojoBoardScreen';

/** PRD F-03 "weekly rank preview": my place this week, one tap to the full Dojo Board. */
export function BoardPreview() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParams>>();
  // Its own cache entry: the board screen uses an infinite query with a different data shape.
  const board = useQuery({
    queryKey: [...BOARD_KEY, 'preview'],
    queryFn: () => leaderboardApi.weekly(),
  });
  const { refetch } = board;
  // Refresh on return to the Dojo, so a just-finished kata shows in my rank.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const me = board.data?.me;
  const line = board.isError
    ? 'See who is climbing this week'
    : me
      ? `You're #${me.rank} this week · ${me.weeklyXP} XP`
      : board.data
        ? 'Not on the board yet this week'
        : 'Loading this week…';
  return (
    <Pressable
      onPress={() => navigation.navigate('DojoBoard')}
      accessibilityRole="button"
      accessibilityLabel={`Dojo Board. ${line}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.body}>
        <AppText variant="label" color="textMuted">
          Dojo Board
        </AppText>
        <AppText color="textSoft">{line}</AppText>
      </View>
      <AppText color="textMuted">›</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    minHeight: layout.touchTarget,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  body: { flex: 1, gap: spacing.xs },
});

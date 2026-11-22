import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { leaderboardApi } from '../../api';
import { BOARD_KEY } from '../board/DojoBoardScreen';

/** This week's place on the Dojo Board for the ema plaque; refreshed when the Dojo regains focus. */
export function useWeeklyRank(): { rank: number | null } {
  // Its own cache entry: the board screen uses an infinite query with a different data shape.
  const query = useQuery({
    queryKey: [...BOARD_KEY, 'preview'],
    queryFn: () => leaderboardApi.weekly(),
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  return { rank: query.data?.me?.rank ?? null };
}

import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { usersApi } from '../api';

export const PROGRESS_KEY = ['progress'] as const;

/** Rank, lantern, moons and weakest topic. Refreshed whenever the screen using it regains focus. */
export function useProgress() {
  const query = useQuery({ queryKey: PROGRESS_KEY, queryFn: usersApi.progress });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  return query;
}

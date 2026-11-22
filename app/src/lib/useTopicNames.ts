import { useQuery } from '@tanstack/react-query';
import type { TopicSlug } from '@luna/shared';
import { topicsApi } from '../api';

/** Slug → display name, from the cached topics list. Falls back to the slug while loading. */
export function useTopicNames(): (slug: TopicSlug) => string {
  const { data } = useQuery({ queryKey: ['topics'], queryFn: topicsApi.list });
  return (slug) => data?.find((t) => t.slug === slug)?.name ?? slug;
}

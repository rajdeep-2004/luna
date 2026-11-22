import { QueryClient } from '@tanstack/react-query';

/** The fetch client already retries GETs with backoff, so React Query does not retry on top of it. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

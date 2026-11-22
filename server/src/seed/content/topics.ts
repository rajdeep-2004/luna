import type { TopicSlug } from '@luna/shared';

export const TOPICS: { slug: TopicSlug; name: string; description: string; icon: string; order: number }[] = [
  { slug: 'js-async', name: 'JavaScript & Async', description: 'Event loop, promises, async/await and execution order.', icon: 'braces', order: 1 },
  { slug: 'http-apis', name: 'HTTP & APIs', description: 'Methods, status codes, REST design and authentication.', icon: 'globe', order: 2 },
  { slug: 'databases', name: 'Databases', description: 'SQL, joins, indexes and transactions.', icon: 'database', order: 3 },
  { slug: 'caching-queues', name: 'Caching & Queues', description: 'Redis, TTLs, invalidation and background jobs.', icon: 'layers', order: 4 },
  { slug: 'debugging-prod', name: 'Debugging & Production', description: 'Logs, errors, latency and safe deploys.', icon: 'activity', order: 5 },
];

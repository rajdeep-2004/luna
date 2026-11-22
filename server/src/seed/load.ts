import { ChallengeSeed } from './schema';
import { CHALLENGES, TOPICS } from './content';
import { TopicModel } from '../models/Topic';
import { ChallengeModel } from '../models/Challenge';

const ESTIMATED_TIME_SEC = { TRACE: 40, BUG_HUNT: 50, ENGINEER_CHOICE: 40, INCIDENT: 135 } as const;

/** Validates the whole bank. Throws with every problem listed, so nothing half-loads. */
export function validateContent() {
  const errors: string[] = [];
  const parsed = CHALLENGES.map((c, i) => {
    const r = ChallengeSeed.safeParse(c);
    if (!r.success) errors.push(`#${i} ${c.slug}: ${r.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`);
    return r.data;
  });
  const slugs = new Set<string>();
  for (const c of CHALLENGES) {
    if (slugs.has(c.slug)) errors.push(`duplicate slug ${c.slug}`);
    slugs.add(c.slug);
  }
  if (errors.length) throw new Error(`Question bank is invalid:\n${errors.join('\n')}`);
  return parsed.filter((c): c is NonNullable<typeof c> => Boolean(c));
}

/** Idempotent: upserts by slug and deactivates challenges that were removed from the bank. */
export async function loadContent() {
  const challenges = validateContent();
  await TopicModel.bulkWrite(
    TOPICS.map((t) => ({ updateOne: { filter: { slug: t.slug }, update: { $set: t }, upsert: true } })),
  );
  await ChallengeModel.bulkWrite(
    challenges.map((c) => ({
      updateOne: {
        filter: { slug: c.slug },
        update: { $set: { ...c, estimatedTimeSec: ESTIMATED_TIME_SEC[c.type], isActive: true } },
        upsert: true,
      },
    })),
  );
  const removed = await ChallengeModel.updateMany(
    { slug: { $nin: challenges.map((c) => c.slug) } },
    { $set: { isActive: false } },
  );
  return { topics: TOPICS.length, challenges: challenges.length, deactivated: removed.modifiedCount };
}

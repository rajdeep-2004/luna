import type {
  PublicChallenge,
  PublicOption,
  PublicStage,
  TopicSlug,
  Difficulty,
  ChallengeType,
} from '@luna/shared';
import type { ChallengeDoc } from '../../models/Challenge';

type Opt = { id: string; text: string };

function ordered(options: Opt[], order: string[] | undefined): PublicOption[] {
  const byId = new Map(options.map((o) => [o.id, o]));
  const ids = order?.length ? order : options.map((o) => o.id);
  return ids.flatMap((id) => {
    const o = byId.get(id);
    return o ? [{ id: o.id, text: o.text }] : [];
  });
}

/**
 * The only way challenge content reaches a client before it's answered. It copies an allow-list of
 * fields, so answerKey, explanation, misconception, hint and rootCause can never slip through.
 */
export function toPublicChallenge(c: ChallengeDoc, optionOrders: string[][]): PublicChallenge {
  const isIncident = c.type === 'INCIDENT';
  return {
    id: c._id.toString(),
    title: c.title,
    topicSlug: c.topicSlug as TopicSlug,
    subtopic: c.subtopic,
    type: c.type as ChallengeType,
    difficulty: c.difficulty as Difficulty,
    prompt: c.prompt,
    ...(c.codeSnippet ? { codeSnippet: c.codeSnippet } : {}),
    ...(!isIncident && c.options.length ? { options: ordered(c.options, optionOrders[0]) } : {}),
    hasHint: !isIncident && Boolean(c.hint),
    estimatedTimeSec: c.estimatedTimeSec,
    stageCount: isIncident ? c.stages.length : 1,
  };
}

export function toPublicStage(
  c: ChallengeDoc,
  index: number,
  optionOrders: string[][],
): PublicStage | undefined {
  const s = c.stages[index];
  if (!s) return undefined;
  return {
    index,
    title: s.title,
    evidence: s.evidence,
    prompt: s.prompt,
    options: ordered(s.options, optionOrders[index]),
    hasHint: Boolean(s.hint),
  };
}

/** Number of answers a challenge needs: one per incident stage, otherwise one. */
export function answerCount(c: ChallengeDoc): number {
  return c.type === 'INCIDENT' ? c.stages.length : 1;
}

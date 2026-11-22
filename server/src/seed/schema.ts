import { z } from 'zod';
import { TOPIC_SLUGS } from '@luna/shared';

/** Content is validated at seed time so a typo in the question bank fails loudly, not in the app. */
const Option = z.object({ id: z.string().min(1), text: z.string().min(1) });
const base = {
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  topicSlug: z.enum(TOPIC_SLUGS),
  subtopic: z.string().min(2),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  prompt: z.string().min(10),
  hint: z.string().optional(),
};

type WithOptions = { options: { id: string }[]; answerKey: string };
const answerKeyMatches = (c: WithOptions) => c.options.some((o) => o.id === c.answerKey);
const uniqueOptionIds = (c: WithOptions) => new Set(c.options.map((o) => o.id)).size === 4;

export const TraceSeed = z
  .object({
    ...base,
    type: z.literal('TRACE'),
    codeSnippet: z.string().optional(),
    options: z.array(Option).length(4),
    answerKey: z.string(),
    explanation: z.string().min(20),
    misconception: z.string().min(10),
  })
  .refine(answerKeyMatches, 'answerKey must match an option id')
  .refine(uniqueOptionIds, 'option ids must be unique');

export const ChoiceSeed = z
  .object({
    ...base,
    type: z.literal('ENGINEER_CHOICE'),
    options: z.array(Option).length(4),
    answerKey: z.string(),
    explanation: z.string().min(20),
    misconception: z.string().min(10),
    optionFeedback: z.record(z.string(), z.string()),
  })
  .refine(answerKeyMatches, 'answerKey must match an option id')
  .refine(uniqueOptionIds, 'option ids must be unique');

export const BugHuntSeed = z
  .object({
    ...base,
    type: z.literal('BUG_HUNT'),
    codeSnippet: z.string().min(10),
    answerKey: z.string().regex(/^\d+$/),
    explanation: z.string().min(20),
    misconception: z.string().min(10),
  })
  .refine(
    (c) => Number(c.answerKey) >= 1 && Number(c.answerKey) <= c.codeSnippet.split('\n').length,
    'Bug Hunt answerKey must be a line number inside the snippet',
  );

const Stage = z
  .object({
    title: z.string(),
    evidence: z.string().min(10),
    prompt: z.string().min(5),
    options: z.array(Option).length(4),
    answerKey: z.string(),
    explanation: z.string().min(20),
    misconception: z.string().min(10),
    hint: z.string().optional(),
  })
  .refine(
    (s) => s.options.some((o) => o.id === s.answerKey),
    'stage answerKey must match an option id',
  );

export const IncidentSeed = z.object({
  ...base,
  type: z.literal('INCIDENT'),
  stages: z.array(Stage).length(3),
  rootCause: z.string().min(20),
});

export const ChallengeSeed = z.union([TraceSeed, ChoiceSeed, BugHuntSeed, IncidentSeed]);
export type ChallengeSeed = z.input<typeof ChallengeSeed>;

/** Four options with ids a–d, in authoring order (the server shuffles per session). */
export function opts(...texts: [string, string, string, string]) {
  return texts.map((text, i) => ({ id: 'abcd'[i]!, text }));
}

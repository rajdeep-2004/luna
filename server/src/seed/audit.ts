/**
 * Content audit (dev tool only, never imported by the server). Checks the question bank against the
 * V2 rules in docs/product/benchmarks.md §4 and prints a coverage table per topic × type × level.
 *
 *   npm run audit:content -w server                 # the real bank
 *   npm run audit:content -w server -- --strict     # a cell under target is an error (P12 on)
 *   tsx src/seed/audit.ts --content <file.ts>       # audit another module exporting CHALLENGES
 *
 * Exit code 1 when there is at least one error; warnings never fail the run.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPIC_SLUGS, type Difficulty } from '@luna/shared';
import { CONTENT_TARGETS } from '../config/game';
import { ChallengeSeed } from './schema';

type Seed = ChallengeSeed;
type Option = { id: string; text: string };
/** One multiple-choice question: a Trace, a Choice, or one incident stage. */
type McUnit = { topic: string; label: string; options: Option[]; answerKey: string };

export type AuditReport = { errors: string[]; warnings: string[]; table: string[] };

const SINGLE_TYPES = ['TRACE', 'BUG_HUNT', 'ENGINEER_CHOICE'] as const;
const LEVELS: Difficulty[] = [1, 2, 3];
const POSITIONS = ['a', 'b', 'c', 'd'] as const;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Splits the bank into schema-valid entries and one error per invalid entry. */
function validate(bank: readonly unknown[]): { valid: Seed[]; errors: string[] } {
  const valid: Seed[] = [];
  const errors: string[] = [];
  bank.forEach((c, i) => {
    const r = ChallengeSeed.safeParse(c);
    if (r.success) return void valid.push(r.data);
    const slug = (c as { slug?: unknown } | null)?.slug ?? '?';
    const issues = r.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ');
    errors.push(`schema: #${i} ${String(slug)}: ${issues}`);
  });
  return { valid, errors };
}

function duplicateErrors(bank: readonly Seed[]): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const bodies = new Map<string, string>();
  for (const c of bank) {
    if (slugs.has(c.slug)) errors.push(`duplicate slug: ${c.slug}`);
    slugs.add(c.slug);
    const snippet = 'codeSnippet' in c ? (c.codeSnippet ?? '') : '';
    const body = `${c.prompt.trim().toLowerCase()}\n${snippet.trim()}`;
    const first = bodies.get(body);
    if (first) errors.push(`duplicate prompt + snippet: ${c.slug} repeats ${first}`);
    else bodies.set(body, c.slug);
  }
  return errors;
}

function itemErrors(c: Seed): string[] {
  if (c.type === 'BUG_HUNT') {
    const lines = c.codeSnippet.split('\n');
    const n = Number(c.answerKey);
    if (!Number.isInteger(n) || n < 1 || n > lines.length)
      return [`bug hunt line: ${c.slug} answers line ${c.answerKey} of ${lines.length}`];
    if (!lines[n - 1]!.trim()) return [`bug hunt line: ${c.slug} answers blank line ${n}`];
  }
  if (c.type === 'ENGINEER_CHOICE') {
    const feedback = c.optionFeedback ?? {};
    return c.options
      .filter((o) => o.id !== c.answerKey && !feedback[o.id]?.trim())
      .map((o) => `choice feedback: ${c.slug} option ${o.id} has no optionFeedback`);
  }
  return [];
}

function mcUnits(c: Seed): McUnit[] {
  if (c.type === 'TRACE' || c.type === 'ENGINEER_CHOICE')
    return [{ topic: c.topicSlug, label: c.slug, options: c.options, answerKey: c.answerKey }];
  if (c.type === 'INCIDENT')
    return c.stages.map((s, i) => ({
      topic: c.topicSlug,
      label: `${c.slug}#${i + 1}`,
      options: s.options,
      answerKey: s.answerKey,
    }));
  return [];
}

const correctIsLongest = (u: McUnit) => {
  const len = (o: Option) => o.text.length;
  const correct = u.options.find((o) => o.id === u.answerKey);
  return Boolean(correct) && u.options.every((o) => o === correct || len(o) < len(correct!));
};

/** Answer-position skew and the "longest option is right" tell, per topic. */
function balanceWarnings(bank: readonly Seed[]): string[] {
  const units = bank.flatMap(mcUnits).filter((u) => u.options.length === 4);
  return TOPIC_SLUGS.flatMap((topic) => {
    const mine = units.filter((u) => u.topic === topic);
    if (!mine.length) return [];
    const out: string[] = [];
    for (const p of POSITIONS) {
      const share = mine.filter((u) => u.answerKey === p).length / mine.length;
      if (share > CONTENT_TARGETS.maxAnswerPositionShare)
        out.push(
          `answer skew: ${topic} has ${pct(share)} of answers on "${p}" (${mine.length} questions)`,
        );
    }
    const longest = mine.filter(correctIsLongest).length / mine.length;
    if (longest > CONTENT_TARGETS.maxLongestCorrectShare)
      out.push(
        `length tell: ${topic} correct option is the longest in ${pct(longest)} of questions`,
      );
    return out;
  });
}

/** Coverage rows plus "under target" messages. */
function coverage(bank: readonly Seed[]): { table: string[]; under: string[] } {
  const count = (topic: string, type: string, d: number) =>
    bank.filter((c) => c.topicSlug === topic && c.type === type && c.difficulty === d).length;
  const table = [
    `topic            | ${[...SINGLE_TYPES, 'INCIDENT'].map((t) => t.padEnd(17)).join('| ')}`,
  ];
  const under: string[] = [];
  for (const topic of TOPIC_SLUGS) {
    const cells = [...SINGLE_TYPES, 'INCIDENT' as const].map((type) =>
      LEVELS.map((d) => {
        const target =
          type === 'INCIDENT'
            ? CONTENT_TARGETS.incidentsByDifficulty[d]
            : CONTENT_TARGETS.singlesPerCell;
        const n = count(topic, type, d);
        if (n < target) under.push(`under target: ${topic} ${type} L${d} has ${n}/${target}`);
        return `${n}/${target}`;
      }).join(' '),
    );
    table.push(`${topic.padEnd(17)}| ${cells.map((c) => c.padEnd(17)).join('| ')}`);
  }
  return { table, under };
}

/**
 * Pure: audits a bank and returns what it found. `strict` makes "under target" an error.
 * Malformed entries are reported as schema errors and skipped by every other check, so one typo
 * can't crash the audit or hide the rest of the report.
 */
export function auditContent(raw: readonly unknown[], strict = false): AuditReport {
  const { valid: bank, errors: schema } = validate(raw);
  const { table, under } = coverage(bank);
  const errors = [...schema, ...duplicateErrors(bank), ...bank.flatMap(itemErrors)];
  const warnings = balanceWarnings(bank);
  (strict ? errors : warnings).push(...under);
  return { errors, warnings, table };
}

async function loadBank(argv: string[]): Promise<Seed[]> {
  const i = argv.indexOf('--content');
  if (i < 0) return (await import('./content')).CHALLENGES;
  const file = argv[i + 1];
  if (!file) throw new Error('--content needs a file path');
  const mod = (await import(pathToFileURL(resolve(file)).href)) as { CHALLENGES?: Seed[] };
  if (!Array.isArray(mod.CHALLENGES)) throw new Error(`${file} does not export CHALLENGES`);
  return mod.CHALLENGES;
}

async function main(argv: string[]) {
  const bank = await loadBank(argv);
  const { errors, warnings, table } = auditContent(bank, argv.includes('--strict'));
  const out = (line = '') => process.stdout.write(`${line}\n`);
  out(`Content audit: ${bank.length} challenges\n`);
  table.forEach((row) => out(row));
  out(`\nWarnings (${warnings.length})`);
  warnings.forEach((w) => out(`  ⚠ ${w}`));
  out(`\nErrors (${errors.length})`);
  errors.forEach((e) => out(`  ✗ ${e}`));
  process.exitCode = errors.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((err: unknown) => {
    process.stderr.write(`audit failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
}

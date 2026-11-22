import { DUEL_FORMAT_RULES, type DuelFormat } from '@luna/shared';
import type { KanjiGlyph } from '../art/kanjiPaths';

/** How each blade is named and drawn (DESIGN.md: Duel). The numbers come from DUEL_FORMAT_RULES. */
export const BLADES: Record<DuelFormat, { name: string; kanji: KanjiGlyph; rule: string }> = {
  CLASSIC: { name: 'Classic', kanji: '刀', rule: '5 × 60s' },
  BLITZ: { name: 'Blitz', kanji: '雷', rule: '10 × 10s' },
  SUDDEN_DEATH: { name: 'Sudden Death', kanji: '一', rule: '1 miss ends it' },
};

/** The rules in one sentence, for the share message and the "ready?" prompt. */
export function rulesLine(format: DuelFormat): string {
  const r = DUEL_FORMAT_RULES[format];
  const secs = r.timerMs / 1000;
  return r.endsOnMiss
    ? `Up to ${r.questions} questions, ${secs} seconds each. Your first miss ends the run.`
    : `${r.questions} questions, ${secs} seconds each.`;
}

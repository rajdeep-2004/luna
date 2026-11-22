import { DUEL_FORMAT_RULES, type DuelFormat } from '@luna/shared';
import type { KanjiGlyph } from '../art/kanjiPaths';

/** How each blade is named and drawn (DESIGN.md: Duel). The numbers come from DUEL_FORMAT_RULES. */
export const BLADES: Record<DuelFormat, { name: string; kanji: KanjiGlyph; rule: string }> = {
  CLASSIC: { name: 'Classic', kanji: '刀', rule: '5 × 60s' },
  BLITZ: { name: 'Blitz', kanji: '雷', rule: '10 × 10s' },
  SUDDEN_DEATH: { name: 'Sudden Death', kanji: '一', rule: '1 miss ends it' },
};

/**
 * The blade for a format. Tolerates a missing or unknown format (an older server, or a duel made
 * before P7) by falling back to Classic, so the UI never crashes on old data.
 */
export function bladeOf(format: DuelFormat | undefined | null) {
  return BLADES[format && format in BLADES ? format : 'CLASSIC'];
}

/** The format, or Classic when the server didn't send one. */
export const formatOrClassic = (format: DuelFormat | undefined | null): DuelFormat =>
  format && format in BLADES ? format : 'CLASSIC';

/** The rules in one sentence, for the share message and the "ready?" prompt. */
export function rulesLine(format: DuelFormat | undefined): string {
  const r = DUEL_FORMAT_RULES[formatOrClassic(format)];
  const secs = r.timerMs / 1000;
  return r.endsOnMiss
    ? `Up to ${r.questions} questions, ${secs} seconds each. Your first miss ends the run.`
    : `${r.questions} questions, ${secs} seconds each.`;
}

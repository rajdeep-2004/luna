import type { AnswerResult, PublicChallenge, PublicOption } from '@luna/shared';
import type { MarkState } from '../../components';
import type { Step } from '../../lib/session';

/** What a body needs to mark options after an answer: the key and whether mine matched it. */
export type Verdict = Pick<AnswerResult, 'correctAnswer' | 'isCorrect'>;

/** The part of a step the single-question bodies read; a session Step and a live duel question both fit. */
export type ChallengeStep = {
  item: { challenge: PublicChallenge };
  prompt: string;
  options: PublicOption[];
};

/** Props shared by the mode bodies. */
export type BodyProps<S extends ChallengeStep = Step> = {
  step: S;
  selected: string | null;
  result: Verdict | null;
  onSelect: (answer: string) => void;
  /** True while submitting or after the verdict arrived: selection is locked. */
  locked: boolean;
};

/** Option state before and after the verdict. */
export function optionState(
  id: string,
  selected: string | null,
  result: Verdict | null,
): MarkState {
  if (result) {
    if (id === result.correctAnswer) return 'correct';
    if (id === selected) return 'wrong';
    return 'none';
  }
  return id === selected ? 'selected' : 'none';
}

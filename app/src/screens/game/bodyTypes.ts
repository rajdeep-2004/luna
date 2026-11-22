import type { AnswerResult } from '@luna/shared';
import type { MarkState } from '../../components';
import type { Step } from '../../lib/session';

/** Props shared by the four mode bodies. */
export type BodyProps = {
  step: Step;
  selected: string | null;
  result: AnswerResult | null;
  onSelect: (answer: string) => void;
  /** True while submitting or after the verdict arrived: selection is locked. */
  locked: boolean;
};

/** Option state before and after the verdict. */
export function optionState(
  id: string,
  selected: string | null,
  result: AnswerResult | null,
): MarkState {
  if (result) {
    if (id === result.correctAnswer) return 'correct';
    if (id === selected) return 'wrong';
    return 'none';
  }
  return id === selected ? 'selected' : 'none';
}

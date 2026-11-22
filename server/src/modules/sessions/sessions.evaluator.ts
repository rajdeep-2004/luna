import { AppError } from '../../lib/errors';
import type { ChallengeDoc } from '../../models/Challenge';

export type Evaluation = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  misconception: string;
  optionFeedback?: Record<string, string>;
};

/** Pure: compares an answer with the server-side key for one challenge (or incident stage). */
export function evaluate(c: ChallengeDoc, stageIndex: number, answer: string): Evaluation {
  if (c.type === 'INCIDENT') {
    const stage = c.stages[stageIndex];
    if (!stage) throw new AppError('VALIDATION_ERROR', 'Invalid stage');
    if (!stage.options.some((o) => o.id === answer))
      throw new AppError('VALIDATION_ERROR', 'Unknown option');
    return {
      isCorrect: answer === stage.answerKey,
      correctAnswer: stage.answerKey,
      explanation: stage.explanation,
      misconception: stage.misconception,
    };
  }

  if (c.type === 'BUG_HUNT') {
    const lines = (c.codeSnippet ?? '').split('\n').length;
    const n = Number(answer);
    if (!Number.isInteger(n) || n < 1 || n > lines)
      throw new AppError('VALIDATION_ERROR', 'Pick a line in the snippet');
  } else if (!c.options.some((o) => o.id === answer)) {
    throw new AppError('VALIDATION_ERROR', 'Unknown option');
  }

  const feedback = c.optionFeedback ? Object.fromEntries(c.optionFeedback) : undefined;
  return {
    // Bug Hunt answers are line numbers: compare numerically so "07" matches 7.
    isCorrect:
      c.type === 'BUG_HUNT' ? Number(answer) === Number(c.answerKey) : answer === c.answerKey,
    correctAnswer: c.answerKey ?? '',
    explanation: c.explanation ?? '',
    misconception: c.misconception ?? '',
    ...(feedback ? { optionFeedback: feedback } : {}),
  };
}

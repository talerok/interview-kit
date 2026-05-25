import { AnswerScore } from '../interfaces/interview';

export const SCORE_LABELS: Record<AnswerScore, string> = {
  1: 'Очень слабо',
  2: 'Слабо',
  3: 'Средне',
  4: 'Хорошо',
  5: 'Отлично',
};

export const SCORES: readonly AnswerScore[] = [1, 2, 3, 4, 5];

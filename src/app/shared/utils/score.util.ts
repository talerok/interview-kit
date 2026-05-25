export type Score = 1 | 2 | 3 | 4 | 5;
export type ScoreBand = 'lo' | 'mid' | 'hi';

const SCORE_LABELS: Record<Score, string> = {
  1: 'Очень слабо',
  2: 'Слабо',
  3: 'Средне',
  4: 'Хорошо',
  5: 'Отлично',
};

export const scoreLabel = (score: Score): string => SCORE_LABELS[score];

export const isScore = (n: number): n is Score => n >= 1 && n <= 5 && Number.isInteger(n);

export interface ScoreableAnswer {
  readonly score: Score | null;
  readonly skipped: boolean;
}

export const avgScore = (answers: readonly ScoreableAnswer[]): number => {
  const real = answers.filter((a) => a.score !== null && !a.skipped);
  if (real.length === 0) return 0;
  return real.reduce((sum, a) => sum + (a.score ?? 0), 0) / real.length;
};

export const scoreBand = (score: number): ScoreBand => {
  if (score >= 4.0) return 'hi';
  if (score >= 2.8) return 'mid';
  return 'lo';
};

export const scoreBandLabel = (score: number): string => {
  if (score >= 4.5) return 'Сильный кандидат';
  if (score >= 4.0) return 'Кандидат «выше среднего»';
  if (score >= 3.0) return 'Подходит с оговорками';
  if (score >= 2.0) return 'Слабый кандидат';
  return 'Не подходит';
};

export const scoreDistribution = (answers: readonly ScoreableAnswer[]): readonly number[] => {
  const out = [0, 0, 0, 0, 0];
  for (const a of answers) {
    if (a.skipped || a.score === null) continue;
    if (isScore(a.score)) out[a.score - 1] += 1;
  }
  return out;
};

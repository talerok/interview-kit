import { describe, expect, it } from 'vitest';
import {
  avgScore,
  isScore,
  Score,
  scoreBand,
  scoreBandLabel,
  scoreDistribution,
  scoreLabel,
  ScoreableAnswer,
} from './score.util';

const answer = (score: Score | null, skipped = false): ScoreableAnswer => ({ score, skipped });

describe('score.util', () => {
  describe('scoreLabel', () => {
    it('returns label for each score', () => {
      expect(scoreLabel(1)).toBe('Очень слабо');
      expect(scoreLabel(2)).toBe('Слабо');
      expect(scoreLabel(3)).toBe('Средне');
      expect(scoreLabel(4)).toBe('Хорошо');
      expect(scoreLabel(5)).toBe('Отлично');
    });
  });

  describe('isScore', () => {
    it('accepts integers from 1 to 5', () => {
      for (const n of [1, 2, 3, 4, 5]) expect(isScore(n)).toBe(true);
    });

    it('rejects out-of-range and non-integers', () => {
      expect(isScore(0)).toBe(false);
      expect(isScore(6)).toBe(false);
      expect(isScore(-1)).toBe(false);
      expect(isScore(3.5)).toBe(false);
      expect(isScore(Number.NaN)).toBe(false);
    });
  });

  describe('avgScore', () => {
    it('returns 0 for empty input', () => {
      expect(avgScore([])).toBe(0);
    });

    it('returns 0 when every answer is skipped or null', () => {
      expect(avgScore([answer(null), answer(5, true), answer(null, true)])).toBe(0);
    });

    it('averages only real (non-skipped, non-null) answers', () => {
      expect(avgScore([answer(3), answer(5), answer(null), answer(2, true)])).toBe(4);
    });

    it('matches arithmetic mean exactly for uniform input', () => {
      expect(avgScore([answer(1), answer(1), answer(1)])).toBe(1);
      expect(avgScore([answer(5), answer(5)])).toBe(5);
    });
  });

  describe('scoreBand', () => {
    it('returns "hi" for >= 4.0', () => {
      expect(scoreBand(4.0)).toBe('hi');
      expect(scoreBand(5)).toBe('hi');
    });

    it('returns "mid" for [2.8, 4.0)', () => {
      expect(scoreBand(2.8)).toBe('mid');
      expect(scoreBand(3.99)).toBe('mid');
    });

    it('returns "lo" for < 2.8', () => {
      expect(scoreBand(2.79)).toBe('lo');
      expect(scoreBand(0)).toBe('lo');
    });
  });

  describe('scoreBandLabel', () => {
    it.each([
      [4.5, 'Сильный кандидат'],
      [4.0, 'Кандидат «выше среднего»'],
      [3.0, 'Подходит с оговорками'],
      [2.0, 'Слабый кандидат'],
      [0, 'Не подходит'],
    ])('label(%f) === %s', (score, label) => {
      expect(scoreBandLabel(score)).toBe(label);
    });
  });

  describe('scoreDistribution', () => {
    it('returns zeros for empty input', () => {
      expect(scoreDistribution([])).toEqual([0, 0, 0, 0, 0]);
    });

    it('counts scores by bucket, ignoring skipped and null', () => {
      const dist = scoreDistribution([
        answer(1),
        answer(1),
        answer(3),
        answer(5),
        answer(5, true),
        answer(null),
      ]);
      // 5 is counted once; the second `5` is skipped so dropped
      expect(dist).toEqual([2, 0, 1, 0, 1]);
    });

    it('skips both skipped and null-score answers', () => {
      const dist = scoreDistribution([answer(null), answer(3, true)]);
      expect(dist).toEqual([0, 0, 0, 0, 0]);
    });
  });
});

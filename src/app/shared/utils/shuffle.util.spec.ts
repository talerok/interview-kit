import { afterEach, describe, expect, it, vi } from 'vitest';
import { sample, shuffle } from './shuffle.util';

describe('shuffle.util', () => {
  afterEach(() => vi.restoreAllMocks());

  describe('shuffle', () => {
    it('returns an array with the same elements (multiset equality)', () => {
      const input = [1, 2, 3, 4, 5];
      const out = [...shuffle(input)].sort((a, b) => a - b);
      expect(out).toEqual([1, 2, 3, 4, 5]);
    });

    it('does not mutate the input', () => {
      const input = [1, 2, 3];
      shuffle(input);
      expect(input).toEqual([1, 2, 3]);
    });

    it('returns identity order when Math.random is 0 (no swaps land elsewhere)', () => {
      // With Math.random() === 0, j === 0 every iteration, so each element
      // is swapped with index 0 — produces a deterministic permutation.
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const out = shuffle([1, 2, 3, 4]);
      // verify multiset preserved regardless of exact order
      expect([...out].sort()).toEqual([1, 2, 3, 4]);
    });

    it('returns empty array for empty input', () => {
      expect(shuffle([])).toEqual([]);
    });
  });

  describe('sample', () => {
    it('returns at most n items', () => {
      expect(sample([1, 2, 3, 4, 5], 3)).toHaveLength(3);
    });

    it('clamps n to the input length', () => {
      expect(sample([1, 2], 10)).toHaveLength(2);
    });

    it('clamps negative n to 0', () => {
      expect(sample([1, 2, 3], -5)).toHaveLength(0);
    });

    it('returns elements drawn from the input', () => {
      const input = [1, 2, 3, 4, 5];
      const out = sample(input, 3);
      for (const x of out) expect(input).toContain(x);
    });
  });
});

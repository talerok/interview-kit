import { describe, expect, it } from 'vitest';
import { pluralRu, RuPluralForms } from './plural-ru.util';

const ANSWERS: RuPluralForms = ['ответ', 'ответа', 'ответов'];

describe('pluralRu', () => {
  it.each([
    [0, 'ответов'],
    [1, 'ответ'],
    [2, 'ответа'],
    [3, 'ответа'],
    [4, 'ответа'],
    [5, 'ответов'],
    [10, 'ответов'],
    [11, 'ответов'],
    [12, 'ответов'],
    [13, 'ответов'],
    [14, 'ответов'],
    [15, 'ответов'],
    [19, 'ответов'],
    [20, 'ответов'],
    [21, 'ответ'],
    [22, 'ответа'],
    [25, 'ответов'],
    [101, 'ответ'],
    [111, 'ответов'],
    [121, 'ответ'],
    [122, 'ответа'],
  ])('%d → %s', (n, expected) => {
    expect(pluralRu(n, ANSWERS)).toBe(expected);
  });

  it('handles negative numbers symmetrically', () => {
    expect(pluralRu(-1, ANSWERS)).toBe('ответ');
    expect(pluralRu(-5, ANSWERS)).toBe('ответов');
    expect(pluralRu(-22, ANSWERS)).toBe('ответа');
  });
});

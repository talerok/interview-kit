import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials.util';

describe('initialsOf', () => {
  it('returns first letters of up to two words, uppercased', () => {
    expect(initialsOf('Анна Иванова')).toBe('АИ');
    expect(initialsOf('john smith')).toBe('JS');
  });

  it('caps at two initials', () => {
    expect(initialsOf('Иван Петрович Сидоров')).toBe('ИП');
  });

  it('skips empty parts caused by extra spaces', () => {
    expect(initialsOf('  Анна   Иванова  ')).toBe('АИ');
  });

  it('returns single initial for single-word names', () => {
    expect(initialsOf('Анна')).toBe('А');
  });

  it('returns empty string for empty input', () => {
    expect(initialsOf('')).toBe('');
    expect(initialsOf('   ')).toBe('');
  });
});

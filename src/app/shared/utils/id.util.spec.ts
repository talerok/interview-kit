import { describe, expect, it } from 'vitest';
import { asId, newId } from './id.util';

describe('id.util', () => {
  describe('newId', () => {
    it('returns a UUIDv4-like string', () => {
      const id = newId<'TestId'>();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('returns unique values across calls', () => {
      const a = newId<'A'>();
      const b = newId<'A'>();
      expect(a).not.toBe(b);
    });
  });

  describe('asId', () => {
    it('passes the raw string through (brand is a compile-time fiction)', () => {
      expect(asId<'X'>('abc')).toBe('abc');
    });
  });
});

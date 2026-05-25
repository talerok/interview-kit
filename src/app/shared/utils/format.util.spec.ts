import { describe, expect, it } from 'vitest';
import { fmtDate, fmtDateTime, todayIso } from './format.util';

describe('format.util', () => {
  describe('fmtDate', () => {
    it('returns em-dash for null/undefined/empty', () => {
      expect(fmtDate(null)).toBe('—');
      expect(fmtDate(undefined)).toBe('—');
      expect(fmtDate('')).toBe('—');
    });

    it('formats a Date object in ru-RU locale', () => {
      const out = fmtDate(new Date('2026-05-25T12:00:00Z'));
      expect(out).toContain('2026');
      expect(out).toMatch(/25/);
    });

    it('formats an ISO string', () => {
      const out = fmtDate('2026-05-25');
      expect(out).toContain('2026');
    });

    it('falls back to raw string for invalid dates', () => {
      expect(fmtDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('fmtDateTime', () => {
    it('returns em-dash for nullish', () => {
      expect(fmtDateTime(null)).toBe('—');
    });

    it('renders day, month, and time', () => {
      const out = fmtDateTime(new Date('2026-05-25T09:30:00Z'));
      expect(out).toMatch(/25/);
      expect(out).toMatch(/:\d{2}/);
    });
  });

  describe('todayIso', () => {
    it('returns a string of the form YYYY-MM-DD', () => {
      expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

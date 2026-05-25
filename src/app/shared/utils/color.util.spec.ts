import { describe, expect, it } from 'vitest';
import { colorFromName } from './color.util';

describe('colorFromName', () => {
  it('returns a valid oklch() string', () => {
    expect(colorFromName('Алгоритмы')).toMatch(
      /^oklch\(0\.55 0\.16 \d+(\.\d+)?\)$/,
    );
  });

  it('is deterministic — same name → same color', () => {
    expect(colorFromName('Backend')).toBe(colorFromName('Backend'));
  });

  it('is case- and whitespace-insensitive', () => {
    expect(colorFromName('  Backend  ')).toBe(colorFromName('backend'));
    expect(colorFromName('BACKEND')).toBe(colorFromName('Backend'));
  });

  it('returns the fallback hue for empty / whitespace-only input', () => {
    const fallback = 'oklch(0.55 0.16 264)';
    expect(colorFromName('')).toBe(fallback);
    expect(colorFromName('   ')).toBe(fallback);
  });

  it('different names usually map to different hues', () => {
    const names = ['Алгоритмы', 'Архитектура', 'Системы', 'Продукт', 'Процессы'];
    const colors = new Set(names.map(colorFromName));
    // not a strict guarantee (hash collisions exist) but for 5 short Russian
    // words we expect at least 4 distinct hues
    expect(colors.size).toBeGreaterThanOrEqual(4);
  });
});

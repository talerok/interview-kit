import { describe, expect, it } from 'vitest';
import { CreateTemplateInput } from '../../interfaces/template';
import { buildNewTemplateAggregate } from './template.factory';

const input = (overrides: Partial<CreateTemplateInput> = {}): CreateTemplateInput => ({
  name: 'Backend Senior',
  description: '',
  categoryPreset: 'tech',
  ...overrides,
});

describe('buildNewTemplateAggregate', () => {
  it('trims name + description and derives the two-letter code', () => {
    const out = buildNewTemplateAggregate(input({ name: '  Backend Senior  ', description: ' ok ' }));
    expect(out.template.name).toBe('Backend Senior');
    expect(out.template.description).toBe('ok');
    expect(out.template.code).toBe('BS');
  });

  it('seeds rev=1 and counters that match the produced collections', () => {
    const out = buildNewTemplateAggregate(input({ categoryPreset: 'tech' }));
    expect(out.template.rev).toBe(1);
    expect(out.template.categoryCount).toBe(out.categories.length);
    expect(out.template.questionCount).toBe(0);
    expect(out.questions).toEqual([]);
  });

  it('uses the picked preset categories (tech → 4 categories)', () => {
    const out = buildNewTemplateAggregate(input({ categoryPreset: 'tech' }));
    expect(out.categories).toHaveLength(4);
    expect(out.categories.map((c) => c.order)).toEqual([0, 1, 2, 3]);
  });

  it('empty preset → no categories, counters at 0', () => {
    const out = buildNewTemplateAggregate(input({ categoryPreset: 'none' }));
    expect(out.categories).toEqual([]);
    expect(out.template.categoryCount).toBe(0);
  });

  it('derives deterministic colors from labels (same label → same color)', () => {
    const a = buildNewTemplateAggregate(input({ categoryPreset: 'tech' }));
    const b = buildNewTemplateAggregate(input({ categoryPreset: 'tech' }));
    // Categories with the same label across two builds get the same color.
    expect(a.categories[0].color).toBe(b.categories[0].color);
  });

  it('every produced id is unique', () => {
    const out = buildNewTemplateAggregate(input({ categoryPreset: 'tech' }));
    const ids = [out.template.id, ...out.categories.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

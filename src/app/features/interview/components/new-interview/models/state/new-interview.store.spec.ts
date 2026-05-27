import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { asId } from '../../../../../../shared/utils';
import {
  Category,
  CategoryId,
  Question,
  QuestionId,
  Template,
  TemplateAggregate,
  TemplateId,
} from '../../../../../templates/interfaces/template';
import { NewInterviewStore, UNCATEGORIZED_KEY } from './new-interview.store';

const TID = asId<'TemplateId'>('t1') as TemplateId;
const CAT_A = asId<'CategoryId'>('ca') as CategoryId;
const CAT_B = asId<'CategoryId'>('cb') as CategoryId;

const template: Template = {
  id: TID,
  code: 'TPL',
  name: 'Tpl',
  description: '',
  color: '#000',
  rev: 1,
  categoryCount: 2,
  questionCount: 4,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

const cat = (id: CategoryId, order: number): Category => ({
  id,
  templateId: TID,
  label: id,
  color: '#000',
  order,
});

const question = (id: string, categoryId: CategoryId | null, order = 0): Question => ({
  kind: 'verbal',
  id: asId<'QuestionId'>(id) as QuestionId,
  templateId: TID,
  categoryId,
  text: id,
  weight: 1,
  order,
  criteria: '',
});

const aggregate: TemplateAggregate = {
  template,
  categories: [cat(CAT_A, 0), cat(CAT_B, 1)],
  questions: [
    question('q1', CAT_A, 0),
    question('q2', CAT_A, 1),
    question('q3', CAT_B, 0),
    question('q4', null, 0),
  ],
};

describe('NewInterviewStore', () => {
  it('starts with no template selected and empty picks', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      expect(store.templateId()).toBeNull();
      expect(store.picks()).toEqual([]);
      expect(store.canStart()).toBe(false);
    });
  });

  it('setAggregate seeds one pick per category in order + uncategorized at the tail', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      const picks = store.picks();
      // CAT_A, CAT_B + uncategorized (because q4 has categoryId: null)
      expect(picks).toHaveLength(3);
      expect(picks.map((p) => p.categoryId)).toEqual([CAT_A, CAT_B, UNCATEGORIZED_KEY]);
      expect(picks.every((p) => p.enabled)).toBe(true);
      expect(picks.every((p) => p.mode === 'random')).toBe(true);
    });
  });

  it('does not seed an uncategorized pick when no question is uncategorized', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate({
        ...aggregate,
        questions: aggregate.questions.filter((q) => q.categoryId !== null),
      });
      expect(store.picks().map((p) => p.categoryId)).toEqual([CAT_A, CAT_B]);
    });
  });

  it('seeded pick.count is clamped to availableInCategory', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      const a = store.picks().find((p) => p.categoryId === CAT_A);
      const b = store.picks().find((p) => p.categoryId === CAT_B);
      const uncat = store.picks().find((p) => p.categoryId === UNCATEGORIZED_KEY);
      expect(a?.count).toBe(2);
      expect(b?.count).toBe(1);
      expect(uncat?.count).toBe(1);
    });
  });

  it('effectiveTotal sums effective counts across enabled picks only', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      // CAT_A: 2, CAT_B: 1, uncategorized: 1 → 4
      expect(store.effectiveTotal()).toBe(4);

      store.setEnabled(CAT_B, false);
      expect(store.effectiveTotal()).toBe(3);
    });
  });

  it('setPickCount clamps to [0, availableInCategory]', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);

      store.setPickCount(CAT_A, 99);
      expect(store.picks().find((p) => p.categoryId === CAT_A)?.count).toBe(2);

      store.setPickCount(CAT_A, -5);
      expect(store.picks().find((p) => p.categoryId === CAT_A)?.count).toBe(0);
    });
  });

  it('setPickMode flips the mode', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      store.setPickMode(CAT_A, 'first');
      expect(store.picks().find((p) => p.categoryId === CAT_A)?.mode).toBe('first');
    });
  });

  it('reorderPicks moves a row to the requested index', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      store.reorderPicks(0, 1);
      expect(store.picks().map((p) => p.categoryId)).toEqual([
        CAT_B,
        CAT_A,
        UNCATEGORIZED_KEY,
      ]);
    });
  });

  it('toggleAll flips every pick at once', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      store.toggleAll();
      expect(store.picks().every((p) => !p.enabled)).toBe(true);
      store.toggleAll();
      expect(store.picks().every((p) => p.enabled)).toBe(true);
    });
  });

  it('canStart requires template + name + non-zero total', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      expect(store.canStart()).toBe(false);

      store.setAggregate(aggregate);
      expect(store.canStart()).toBe(false); // name missing

      store.updateCandidate({ name: 'Анна' });
      expect(store.canStart()).toBe(true);

      store.toggleAll(); // disable all → total = 0
      expect(store.canStart()).toBe(false);
    });
  });

  it('runOrder defaults to sequential and is mutable', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      expect(store.runOrder()).toBe('sequential');
      store.setRunOrder('shuffled');
      expect(store.runOrder()).toBe('shuffled');
    });
  });
});

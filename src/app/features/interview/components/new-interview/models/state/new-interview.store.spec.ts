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
import { NewInterviewStore } from './new-interview.store';

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

const question = (id: string, categoryId: CategoryId | null): Question => ({
  id: asId<'QuestionId'>(id) as QuestionId,
  templateId: TID,
  categoryId,
  text: id,
  weight: 1,
  order: 0,
});

const aggregate: TemplateAggregate = {
  template,
  categories: [cat(CAT_A, 0), cat(CAT_B, 1)],
  questions: [
    question('q1', CAT_A),
    question('q2', CAT_A),
    question('q3', CAT_B),
    question('q4', null),
  ],
};

describe('NewInterviewStore', () => {
  it('starts with no template selected and default count', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      expect(store.templateId()).toBeNull();
      expect(store.count()).toBe(8);
      expect(store.canStart()).toBe(false);
    });
  });

  it('setTemplateId resets aggregate and category selection', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setTemplateId(TID);
      store.setAggregate(aggregate);
      store.toggleCategory(CAT_A);
      store.setTemplateId(asId<'TemplateId'>('t2') as TemplateId);
      expect(store.aggregate()).toBeNull();
      expect(store.activeCategoryIds()).toBeNull();
    });
  });

  it('effectiveActiveCategoryIds defaults to all categories when nothing is explicit', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      expect(store.effectiveActiveCategoryIds()).toEqual([CAT_A, CAT_B]);
    });
  });

  it('filteredQuestions excludes uncategorized questions and respects active set', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      // by default: all categories active → q1, q2, q3 (q4 is uncategorized)
      expect(store.filteredQuestions().map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);

      store.toggleCategory(CAT_B);
      // CAT_B disabled → only CAT_A questions
      expect(store.filteredQuestions().map((q) => q.id)).toEqual(['q1', 'q2']);
    });
  });

  it('toggleCategory deselects an already-active category', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      store.toggleCategory(CAT_A);
      expect(store.effectiveActiveCategoryIds()).toEqual([CAT_B]);
    });
  });

  it('toggleAllCategories empties when everything is selected, restores all otherwise', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      store.toggleAllCategories();
      expect(store.effectiveActiveCategoryIds()).toEqual([]);
      store.toggleAllCategories();
      expect(store.effectiveActiveCategoryIds()).toEqual([CAT_A, CAT_B]);
    });
  });

  it('setCount clamps to a minimum of 1', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setCount(0);
      expect(store.count()).toBe(1);
      store.setCount(-3);
      expect(store.count()).toBe(1);
      store.setCount(10);
      expect(store.count()).toBe(10);
    });
  });

  it('effectiveCount = min(count, availableCount)', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      store.setAggregate(aggregate);
      store.setCount(2);
      expect(store.effectiveCount()).toBe(2);
      store.setCount(99);
      // only 3 categorized questions are available
      expect(store.effectiveCount()).toBe(3);
    });
  });

  it('canStart requires aggregate + name + questions', () => {
    TestBed.runInInjectionContext(() => {
      const store = new NewInterviewStore();
      expect(store.canStart()).toBe(false);

      store.setAggregate(aggregate);
      expect(store.canStart()).toBe(false);

      store.updateCandidate({ name: '   ' });
      expect(store.canStart()).toBe(false);

      store.updateCandidate({ name: 'Анна' });
      expect(store.canStart()).toBe(true);

      // deselecting all categories drops effectiveCount to 0
      store.toggleAllCategories();
      expect(store.canStart()).toBe(false);
    });
  });
});

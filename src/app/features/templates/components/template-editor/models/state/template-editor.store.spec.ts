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
} from '../../../../interfaces/template';
import { TemplateEditorStore } from './template-editor.store';

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
  questionCount: 3,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

const cat = (id: CategoryId, order: number, label = id): Category => ({
  id,
  templateId: TID,
  label,
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
  ],
};

describe('TemplateEditorStore', () => {
  it('starts unloaded with no filter and no editing target', () => {
    TestBed.runInInjectionContext(() => {
      const store = new TemplateEditorStore();
      expect(store.isLoaded()).toBe(false);
      expect(store.filter()).toBeNull();
      expect(store.editing()).toBeNull();
    });
  });

  it('setAggregate loads data and resets filter/editing', () => {
    TestBed.runInInjectionContext(() => {
      const store = new TemplateEditorStore();
      store.setFilter(CAT_A);
      store.startEditing('new');
      store.setAggregate(aggregate);
      expect(store.isLoaded()).toBe(true);
      expect(store.filter()).toBeNull();
      expect(store.editing()).toBeNull();
    });
  });

  it('filteredQuestions returns all when no filter is set', () => {
    TestBed.runInInjectionContext(() => {
      const store = new TemplateEditorStore();
      store.setAggregate(aggregate);
      expect(store.filteredQuestions().map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    });
  });

  it('filteredQuestions narrows by category', () => {
    TestBed.runInInjectionContext(() => {
      const store = new TemplateEditorStore();
      store.setAggregate(aggregate);
      store.setFilter(CAT_A);
      expect(store.filteredQuestions().map((q) => q.id)).toEqual(['q1', 'q2']);
    });
  });

  it('questionCountByCategory excludes uncategorized', () => {
    TestBed.runInInjectionContext(() => {
      const store = new TemplateEditorStore();
      store.setAggregate({
        ...aggregate,
        questions: [
          question('q1', CAT_A),
          question('q2', CAT_A),
          question('q3', CAT_B),
          question('q4', null),
        ],
      });
      const counts = store.questionCountByCategory();
      expect(counts[CAT_A]).toBe(2);
      expect(counts[CAT_B]).toBe(1);
      expect(Object.keys(counts)).toHaveLength(2);
    });
  });

  describe('removeCategory', () => {
    it('drops the category and unlinks its questions (does NOT delete them)', () => {
      TestBed.runInInjectionContext(() => {
        const store = new TemplateEditorStore();
        store.setAggregate(aggregate);
        store.removeCategory(CAT_A);
        expect(store.categories().map((c) => c.id)).toEqual([CAT_B]);
        // questions q1, q2 should still exist but now categoryId === null
        const q1 = store.questions().find((q) => q.id === 'q1');
        expect(q1?.categoryId).toBeNull();
        expect(store.questions()).toHaveLength(3);
      });
    });

    it('clears the active filter when its category is removed', () => {
      TestBed.runInInjectionContext(() => {
        const store = new TemplateEditorStore();
        store.setAggregate(aggregate);
        store.setFilter(CAT_A);
        store.removeCategory(CAT_A);
        expect(store.filter()).toBeNull();
      });
    });

    it('preserves filter when an unrelated category is removed', () => {
      TestBed.runInInjectionContext(() => {
        const store = new TemplateEditorStore();
        store.setAggregate(aggregate);
        store.setFilter(CAT_A);
        store.removeCategory(CAT_B);
        expect(store.filter()).toBe(CAT_A);
      });
    });
  });

  it('updateQuestion replaces a question by id', () => {
    TestBed.runInInjectionContext(() => {
      const store = new TemplateEditorStore();
      store.setAggregate(aggregate);
      store.updateQuestion(question('q1', CAT_B));
      const q1 = store.questions().find((q) => q.id === 'q1');
      expect(q1?.categoryId).toBe(CAT_B);
    });
  });

  it('removeQuestion drops only the matching question', () => {
    TestBed.runInInjectionContext(() => {
      const store = new TemplateEditorStore();
      store.setAggregate(aggregate);
      store.removeQuestion(asId<'QuestionId'>('q2') as QuestionId);
      expect(store.questions().map((q) => q.id)).toEqual(['q1', 'q3']);
    });
  });

  it('replaceTemplate swaps the template object preserving categories/questions', () => {
    TestBed.runInInjectionContext(() => {
      const store = new TemplateEditorStore();
      store.setAggregate(aggregate);
      store.replaceTemplate({ ...template, name: 'Updated', rev: 99 });
      expect(store.template()?.name).toBe('Updated');
      expect(store.categories()).toHaveLength(2);
    });
  });
});

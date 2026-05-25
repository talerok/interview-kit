import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { asId } from '../../../../shared/utils';
import {
  Answer,
  Interview,
  InterviewAggregate,
} from '../../../interview/interfaces/interview';
import {
  Category,
  CategoryId,
  Template,
  TemplateAggregate,
  TemplateId,
} from '../../../templates/interfaces/template';
import { ResultStore } from './result.store';

const TEMPLATE_ID = asId<'TemplateId'>('t1') as TemplateId;
const INTERVIEW_ID = asId<'InterviewId'>('iv1');
const CAT_ALGO = asId<'CategoryId'>('cat-algo') as CategoryId;
const CAT_SYSTEM = asId<'CategoryId'>('cat-system') as CategoryId;

const template: Template = {
  id: TEMPLATE_ID,
  code: 'TPL_BACKEND',
  name: 'Backend',
  description: '',
  color: '#3b82f6',
  rev: 1,
  categoryCount: 2,
  questionCount: 4,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

const categories: readonly Category[] = [
  { id: CAT_ALGO, templateId: TEMPLATE_ID, label: 'Алгоритмы', color: '#3b82f6', order: 0 },
  { id: CAT_SYSTEM, templateId: TEMPLATE_ID, label: 'Системы', color: '#10b981', order: 1 },
];

const templateAggregate: TemplateAggregate = {
  template,
  categories,
  questions: [],
};

const answer = (
  id: string,
  categoryId: CategoryId | null,
  score: Answer['score'],
  skipped = false,
): Answer => ({
  id: asId<'AnswerId'>(id),
  interviewId: INTERVIEW_ID,
  questionId: asId<'QuestionId'>(`q-${id}`),
  categoryId,
  questionText: '',
  questionWeight: 1,
  score,
  comment: '',
  skipped,
  order: 0,
});

const interview: Interview = {
  id: INTERVIEW_ID,
  templateId: TEMPLATE_ID,
  status: 'completed',
  candidate: { name: 'Анна', position: 'Backend', date: '2026-05-20' },
  durationMin: 45,
  notes: '',
  rev: 1,
  answersCount: 4,
  answeredCount: 3,
  skippedCount: 1,
  avg: 4,
  createdAt: '2026-05-20T10:00:00.000Z',
  updatedAt: '2026-05-20T10:45:00.000Z',
};

const interviewAggregate = (answers: readonly Answer[]): InterviewAggregate => ({
  interview,
  answers,
});

describe('ResultStore', () => {
  it('starts in not-loaded state with no data', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ResultStore();
      expect(store.isLoaded()).toBe(false);
      expect(store.interview()).toBeNull();
      expect(store.template()).toBeNull();
      expect(store.answers()).toEqual([]);
      expect(store.categories()).toEqual([]);
    });
  });

  it('set() loads data and marks store as loaded', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ResultStore();
      store.set(interviewAggregate([]), templateAggregate);
      expect(store.isLoaded()).toBe(true);
      expect(store.interview()).toEqual(interview);
      expect(store.template()).toEqual(template);
    });
  });

  it('avg ignores skipped and null-score answers', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ResultStore();
      store.set(
        interviewAggregate([
          answer('a', CAT_ALGO, 5),
          answer('b', CAT_ALGO, 3),
          answer('c', CAT_SYSTEM, null, true),
          answer('d', CAT_SYSTEM, null),
        ]),
        templateAggregate,
      );
      expect(store.avg()).toBe(4);
      expect(store.band()).toBe('hi');
    });
  });

  it('counts answered and skipped separately', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ResultStore();
      store.set(
        interviewAggregate([
          answer('a', CAT_ALGO, 5),
          answer('b', CAT_ALGO, 4),
          answer('c', CAT_SYSTEM, null, true),
          answer('d', CAT_SYSTEM, null, true),
        ]),
        templateAggregate,
      );
      expect(store.answeredCount()).toBe(2);
      expect(store.skippedCount()).toBe(2);
    });
  });

  it('distribution buckets by score 1..5', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ResultStore();
      store.set(
        interviewAggregate([
          answer('a', CAT_ALGO, 1),
          answer('b', CAT_ALGO, 1),
          answer('c', CAT_SYSTEM, 5),
          answer('d', CAT_SYSTEM, null, true),
        ]),
        templateAggregate,
      );
      expect(store.distribution()).toEqual([2, 0, 0, 0, 1]);
    });
  });

  describe('categoryAverages', () => {
    it('returns one bucket per category, in category order', () => {
      TestBed.runInInjectionContext(() => {
        const store = new ResultStore();
        store.set(
          interviewAggregate([
            answer('a', CAT_ALGO, 5),
            answer('b', CAT_ALGO, 3),
            answer('c', CAT_SYSTEM, 4),
          ]),
          templateAggregate,
        );
        const out = store.categoryAverages();
        expect(out).toHaveLength(2);
        expect(out[0].category.id).toBe(CAT_ALGO);
        expect(out[0].avg).toBe(4);
        expect(out[0].count).toBe(2);
        expect(out[1].category.id).toBe(CAT_SYSTEM);
        expect(out[1].avg).toBe(4);
        expect(out[1].count).toBe(1);
      });
    });

    it('reports zero avg/count for categories with no real answers', () => {
      TestBed.runInInjectionContext(() => {
        const store = new ResultStore();
        store.set(
          interviewAggregate([
            answer('a', CAT_ALGO, 5),
            answer('b', CAT_SYSTEM, null, true),
            answer('c', CAT_SYSTEM, null),
          ]),
          templateAggregate,
        );
        const out = store.categoryAverages();
        expect(out[1].avg).toBe(0);
        expect(out[1].count).toBe(0);
      });
    });

    it('ignores answers with null categoryId (uncategorized)', () => {
      TestBed.runInInjectionContext(() => {
        const store = new ResultStore();
        store.set(
          interviewAggregate([
            answer('a', null, 5),
            answer('b', CAT_ALGO, 3),
          ]),
          templateAggregate,
        );
        const out = store.categoryAverages();
        expect(out[0].avg).toBe(3);
        expect(out[0].count).toBe(1);
      });
    });

    it('returns empty array when template has no categories', () => {
      TestBed.runInInjectionContext(() => {
        const store = new ResultStore();
        store.set(
          interviewAggregate([answer('a', CAT_ALGO, 5)]),
          { ...templateAggregate, categories: [] },
        );
        expect(store.categoryAverages()).toEqual([]);
      });
    });
  });
});

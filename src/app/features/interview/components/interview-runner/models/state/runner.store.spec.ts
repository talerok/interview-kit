import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { asId } from '../../../../../../shared/utils';
import {
  Answer,
  Interview,
  InterviewAggregate,
  InterviewId,
} from '../../../../interfaces/interview';
import { TemplateId } from '../../../../../templates/interfaces/template';
import { RunnerStore } from './runner.store';

const IID = asId<'InterviewId'>('iv1') as InterviewId;

const baseInterview: Interview = {
  id: IID,
  templateId: asId<'TemplateId'>('t1') as TemplateId,
  status: 'in-progress',
  candidate: { name: 'Анна', position: 'Backend', date: '2026-05-25' },
  durationMin: 0,
  notes: '',
  rev: 1,
  answersCount: 0,
  answeredCount: 0,
  skippedCount: 0,
  avg: 0,
  createdAt: '2026-05-25T10:00:00.000Z',
  updatedAt: '2026-05-25T10:00:00.000Z',
};

const answer = (
  id: string,
  score: Answer['score'] = null,
  skipped = false,
): Answer => ({
  id: asId<'AnswerId'>(id),
  interviewId: IID,
  questionId: asId<'QuestionId'>(`q-${id}`),
  categoryId: null,
  questionText: `Q ${id}`,
  questionWeight: 1,
  questionCriteria: '',
  score,
  comment: '',
  skipped,
  order: 0,
});

const aggregate = (answers: readonly Answer[]): InterviewAggregate => ({
  interview: baseInterview,
  answers,
});

describe('RunnerStore', () => {
  it('starts unloaded with idx=0', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      expect(store.isLoaded()).toBe(false);
      expect(store.idx()).toBe(0);
      expect(store.currentAnswer()).toBeNull();
    });
  });

  it('setAggregate() loads, resets idx, and updates startedAt', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setIndex(3);
      store.setAggregate(aggregate([answer('a'), answer('b')]));
      expect(store.isLoaded()).toBe(true);
      expect(store.idx()).toBe(0);
      expect(store.totalCount()).toBe(2);
    });
  });

  it('setIndex clamps to [0, totalCount-1]', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(aggregate([answer('a'), answer('b'), answer('c')]));

      store.setIndex(-5);
      expect(store.idx()).toBe(0);

      store.setIndex(99);
      expect(store.idx()).toBe(2);

      store.setIndex(1);
      expect(store.idx()).toBe(1);
    });
  });

  it('setIndex is a no-op when there are no answers', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(aggregate([]));
      store.setIndex(5);
      expect(store.idx()).toBe(0);
    });
  });

  it('canPrev/canNext reflect index position', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(aggregate([answer('a'), answer('b'), answer('c')]));

      expect(store.canPrev()).toBe(false);
      expect(store.canNext()).toBe(true);

      store.setIndex(1);
      expect(store.canPrev()).toBe(true);
      expect(store.canNext()).toBe(true);

      store.setIndex(2);
      expect(store.canPrev()).toBe(true);
      expect(store.canNext()).toBe(false);
    });
  });

  it('progressPercent rounds (answered + skipped) / total', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(
        aggregate([answer('a', 5), answer('b', null, true), answer('c')]),
      );
      // 2 of 3 → 67%
      expect(store.progressPercent()).toBe(67);
    });

    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(aggregate([]));
      expect(store.progressPercent()).toBe(0);
    });
  });

  it('patchCurrentAnswer replaces the current answer with patched fields only', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(aggregate([answer('a'), answer('b')]));

      const result = store.patchCurrentAnswer({ score: 4, comment: 'OK' });
      expect(result).not.toBeNull();
      expect(result!.score).toBe(4);
      expect(result!.comment).toBe('OK');
      expect(store.currentAnswer()!.score).toBe(4);
      expect(store.currentAnswer()!.comment).toBe('OK');
    });
  });

  it('patchCurrentAnswer treats omitted fields as unchanged (not cleared)', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(aggregate([answer('a')]));

      store.patchCurrentAnswer({ score: 4, comment: 'first' });
      store.patchCurrentAnswer({ skipped: true });

      const current = store.currentAnswer()!;
      expect(current.score).toBe(4);
      expect(current.comment).toBe('first');
      expect(current.skipped).toBe(true);
    });
  });

  it('patchCurrentAnswer can explicitly clear score back to null', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(aggregate([answer('a', 5)]));
      store.patchCurrentAnswer({ score: null });
      expect(store.currentAnswer()!.score).toBeNull();
    });
  });

  it('patchCurrentAnswer returns null when no aggregate is loaded', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      expect(store.patchCurrentAnswer({ score: 3 })).toBeNull();
    });
  });

  it('replaceInterview swaps the interview object but preserves answers', () => {
    TestBed.runInInjectionContext(() => {
      const store = new RunnerStore();
      store.setAggregate(aggregate([answer('a'), answer('b')]));
      const updated: Interview = { ...baseInterview, status: 'completed', rev: 99 };
      store.replaceInterview(updated);
      expect(store.interview()).toEqual(updated);
      expect(store.totalCount()).toBe(2);
    });
  });
});

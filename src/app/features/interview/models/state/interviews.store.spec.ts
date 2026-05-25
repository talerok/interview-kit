import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { asId } from '../../../../shared/utils';
import { Interview, InterviewId } from '../../interfaces/interview';
import { TemplateId } from '../../../templates/interfaces/template';
import { InterviewsStore } from './interviews.store';

const baseInterview = (id: string, status: Interview['status']): Interview => ({
  id: asId<'InterviewId'>(id) as InterviewId,
  templateId: asId<'TemplateId'>('t1') as TemplateId,
  status,
  candidate: { name: 'X', position: 'Y', date: '2026-05-25' },
  durationMin: 30,
  notes: '',
  rev: 1,
  answersCount: 0,
  answeredCount: 0,
  skippedCount: 0,
  avg: 0,
  createdAt: '2026-05-25T10:00:00.000Z',
  updatedAt: '2026-05-25T10:00:00.000Z',
});

describe('InterviewsStore', () => {
  it('completed() returns only finished interviews', () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      const store = TestBed.inject(InterviewsStore);
      store.set([
        baseInterview('a', 'completed'),
        baseInterview('b', 'in-progress'),
        baseInterview('c', 'completed'),
        baseInterview('d', 'cancelled'),
      ]);
      const completed = store.completed();
      expect(completed.map((i) => i.id)).toEqual(['a', 'c']);
      expect(store.completedCount()).toBe(2);
    });
  });

  it('completed() recomputes when the list changes', () => {
    TestBed.configureTestingModule({});
    TestBed.runInInjectionContext(() => {
      const store = TestBed.inject(InterviewsStore);
      store.set([baseInterview('a', 'in-progress')]);
      expect(store.completedCount()).toBe(0);

      store.upsert(baseInterview('a', 'completed'), (i) => i.id);
      expect(store.completedCount()).toBe(1);
    });
  });
});

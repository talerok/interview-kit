import { TestBed } from '@angular/core/testing';
import { Signal, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceService } from '../../../../core/workspace';
import { asId } from '../../../../shared/utils';
import { Interview, InterviewId } from '../../interfaces/interview';
import { TemplateId } from '../../../templates/interfaces/template';
import { InterviewRepo } from '../data/interview.repo';
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

interface StubWorkspace {
  readonly dataToken: Signal<number>;
  bump(): void;
}

const stubWorkspace = (): StubWorkspace => {
  const token = signal(0);
  return {
    dataToken: token.asReadonly(),
    bump: () => token.update((v) => v + 1),
  };
};

const stubRepo = (initial: readonly Interview[]) => {
  const list = vi.fn<() => Observable<readonly Interview[]>>(() => of(initial));
  return { list, setNext: (next: readonly Interview[]) => list.mockReturnValueOnce(of(next)) };
};

describe('InterviewsStore', () => {
  let workspace: StubWorkspace;

  beforeEach(() => {
    workspace = stubWorkspace();
  });

  it('loads interviews from the repo on first read of value()', async () => {
    const repo = stubRepo([baseInterview('a', 'completed'), baseInterview('b', 'in-progress')]);
    TestBed.configureTestingModule({
      providers: [
        { provide: InterviewRepo, useValue: repo },
        { provide: WorkspaceService, useValue: workspace },
      ],
    });
    const store = TestBed.inject(InterviewsStore);

    // rxResource resolves async — flush microtasks
    await new Promise((r) => setTimeout(r, 0));

    expect(repo.list).toHaveBeenCalledTimes(1);
    expect(store.value()).toHaveLength(2);
  });

  it('completed() returns only finished interviews', async () => {
    const repo = stubRepo([
      baseInterview('a', 'completed'),
      baseInterview('b', 'in-progress'),
      baseInterview('c', 'completed'),
      baseInterview('d', 'cancelled'),
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: InterviewRepo, useValue: repo },
        { provide: WorkspaceService, useValue: workspace },
      ],
    });
    const store = TestBed.inject(InterviewsStore);
    await new Promise((r) => setTimeout(r, 0));

    expect(store.completed().map((i) => i.id)).toEqual(['a', 'c']);
    expect(store.completedCount()).toBe(2);
  });

  it('upsert patches the in-memory cache for optimistic UX', async () => {
    const repo = stubRepo([baseInterview('a', 'in-progress')]);
    TestBed.configureTestingModule({
      providers: [
        { provide: InterviewRepo, useValue: repo },
        { provide: WorkspaceService, useValue: workspace },
      ],
    });
    const store = TestBed.inject(InterviewsStore);
    await new Promise((r) => setTimeout(r, 0));

    expect(store.completedCount()).toBe(0);
    store.upsert(baseInterview('a', 'completed'), (i) => i.id);
    expect(store.completedCount()).toBe(1);
  });

  it('removeBy drops matching interviews from the cache', async () => {
    const repo = stubRepo([baseInterview('a', 'completed'), baseInterview('b', 'completed')]);
    TestBed.configureTestingModule({
      providers: [
        { provide: InterviewRepo, useValue: repo },
        { provide: WorkspaceService, useValue: workspace },
      ],
    });
    const store = TestBed.inject(InterviewsStore);
    await new Promise((r) => setTimeout(r, 0));

    store.removeBy((i) => i.id === 'a');
    expect(store.value().map((i) => i.id)).toEqual(['b']);
  });
});

import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, map, of, switchMap, tap } from 'rxjs';
import { CloudSyncService } from '../../../../../../api/cloud';
import { newId, sample, shuffle } from '../../../../../../shared/utils';
import {
  CategoryId,
  Question,
  TemplateId,
} from '../../../../../templates/interfaces/template';
import { TemplateRepo } from '../../../../../templates/models/data/template.repo';
import {
  Answer,
  CandidateInfo,
  Interview,
  InterviewAggregate,
  InterviewId,
} from '../../../../interfaces/interview';
import { InterviewRepo } from '../../../../models/data/interview.repo';
import { InterviewsActions } from '../../../../models/state/interviews.actions';
import { CategoryPick, NewInterviewStore, PickMode, RunOrder } from './new-interview.store';

@Injectable()
export class NewInterviewActions {
  private readonly _store = inject(NewInterviewStore);
  private readonly _templateRepo = inject(TemplateRepo);
  private readonly _interviewRepo = inject(InterviewRepo);
  private readonly _interviewsActions = inject(InterviewsActions);
  private readonly _cloudSync = inject(CloudSyncService);

  selectTemplate(id: TemplateId | null): Observable<void> {
    this._store.setTemplateId(id);
    if (id === null) {
      return of(undefined);
    }
    return this._templateRepo.get(id).pipe(
      tap((aggregate) => this._store.setAggregate(aggregate)),
      map(() => undefined),
    );
  }

  setEnabled(categoryId: CategoryId, enabled: boolean): void {
    this._store.setEnabled(categoryId, enabled);
  }

  toggleAllCategories(): void {
    this._store.toggleAll();
  }

  setPickCount(categoryId: CategoryId, value: number): void {
    this._store.setPickCount(categoryId, value);
  }

  setPickMode(categoryId: CategoryId, mode: PickMode): void {
    this._store.setPickMode(categoryId, mode);
  }

  reorderPicks(fromIndex: number, toIndex: number): void {
    this._store.reorderPicks(fromIndex, toIndex);
  }

  setRunOrder(value: RunOrder): void {
    this._store.setRunOrder(value);
  }

  updateCandidate(patch: Partial<CandidateInfo>): void {
    this._store.updateCandidate(patch);
  }

  start(): Observable<Interview> {
    if (!this._store.canStart()) {
      return EMPTY;
    }
    const aggregate = this._buildAggregate();
    if (aggregate === null) {
      return EMPTY;
    }
    return this._interviewRepo.createAggregate(aggregate).pipe(
      switchMap(() => {
        this._interviewsActions.replaceInterview(aggregate.interview);
        this._cloudSync.markDirty({ kind: 'interview', id: aggregate.interview.id });
        return of(aggregate.interview);
      }),
    );
  }

  private _buildAggregate(): InterviewAggregate | null {
    const templateId = this._store.templateId();
    const tpl = this._store.aggregate();
    if (templateId === null || tpl === null) {
      return null;
    }
    const sampled = this._selectQuestions();
    const ordered = this._store.runOrder() === 'shuffled' ? shuffle(sampled) : sampled;
    const now = new Date().toISOString();
    const interviewId = newId<'InterviewId'>();
    const interview: Interview = {
      id: interviewId,
      templateId,
      status: 'in-progress',
      candidate: { ...this._store.candidate() },
      durationMin: 0,
      notes: '',
      rev: 1,
      answersCount: ordered.length,
      answeredCount: 0,
      skippedCount: 0,
      avg: 0,
      createdAt: now,
      updatedAt: now,
    };
    const answers: readonly Answer[] = ordered.map((q, index) => ({
      id: newId<'AnswerId'>(),
      interviewId,
      questionId: q.id,
      categoryId: q.categoryId,
      questionText: q.text,
      questionWeight: q.weight,
      score: null,
      comment: '',
      skipped: false,
      order: index,
    }));
    return { interview, answers };
  }

  /**
   * Pick questions per enabled category-pick using each pick's quota+mode.
   * Returned list is grouped by pick row order (the "sequential" run mode).
   */
  private _selectQuestions(): readonly Question[] {
    const buckets = this._store.questionsByCategory();
    const out: Question[] = [];
    for (const pick of this._store.picks()) {
      if (!pick.enabled) continue;
      const fromBucket = sortedByOrder(buckets[pick.categoryId] ?? []);
      out.push(...takeForPick(fromBucket, pick));
    }
    return out;
  }
}

const sortedByOrder = (qs: readonly Question[]): readonly Question[] =>
  qs.slice().sort((a, b) => a.order - b.order);

const takeForPick = (qs: readonly Question[], pick: CategoryPick): readonly Question[] => {
  const n = Math.min(pick.count, qs.length);
  if (n === 0) return [];
  return pick.mode === 'first' ? qs.slice(0, n) : sample(qs, n);
};

export type { InterviewId };

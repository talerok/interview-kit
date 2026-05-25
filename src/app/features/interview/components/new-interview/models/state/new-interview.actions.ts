import { Injectable, inject } from '@angular/core';
import { Observable, EMPTY, map, of, switchMap, tap } from 'rxjs';
import { CloudSyncService } from '../../../../../../api/cloud';
import { newId, sample } from '../../../../../../shared/utils';
import { TemplateRepo } from '../../../../../templates/models/data/template.repo';
import { CategoryId, TemplateId } from '../../../../../templates/interfaces/template';
import {
  Answer,
  CandidateInfo,
  Interview,
  InterviewAggregate,
  InterviewId,
} from '../../../../interfaces/interview';
import { InterviewRepo } from '../../../../models/data/interview.repo';
import { InterviewsActions } from '../../../../models/state/interviews.actions';
import { NewInterviewStore } from './new-interview.store';

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

  setCount(value: number): void {
    this._store.setCount(value);
  }

  toggleCategory(id: CategoryId): void {
    this._store.toggleCategory(id);
  }

  toggleAllCategories(): void {
    this._store.toggleAllCategories();
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
    const filtered = this._store.filteredQuestions();
    const count = this._store.effectiveCount();
    const sampled = sample(filtered, count);
    const now = new Date().toISOString();
    const interviewId = newId<'InterviewId'>();
    const answersCount = sampled.length;
    const interview: Interview = {
      id: interviewId,
      templateId,
      status: 'in-progress',
      candidate: { ...this._store.candidate() },
      durationMin: 0,
      notes: '',
      rev: 1,
      answersCount,
      answeredCount: 0,
      skippedCount: 0,
      avg: 0,
      createdAt: now,
      updatedAt: now,
    };
    const answers: readonly Answer[] = sampled.map((q, index) => ({
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
}

export type { InterviewId };

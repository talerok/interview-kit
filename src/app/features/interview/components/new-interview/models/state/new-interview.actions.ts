import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, map, of, switchMap, tap } from 'rxjs';
import { CloudSyncService } from '../../../../../../api/cloud';
import { CategoryId, TemplateId } from '../../../../../templates/interfaces/template';
import { TemplateRepo } from '../../../../../templates/models/data/template.repo';
import { CandidateInfo, Interview, InterviewId } from '../../../../interfaces/interview';
import { InterviewRepo } from '../../../../models/data/interview.repo';
import { InterviewsActions } from '../../../../models/state/interviews.actions';
import { buildNewInterviewAggregate } from '../data/new-interview.factory';
import { NewInterviewStore, PickMode, RunOrder } from './new-interview.store';

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
    const templateId = this._store.templateId();
    if (templateId === null) return EMPTY;

    const aggregate = buildNewInterviewAggregate({
      templateId,
      candidate: this._store.candidate(),
      picks: this._store.picks(),
      questionsByCategory: this._store.questionsByCategory(),
      runOrder: this._store.runOrder(),
    });

    return this._interviewRepo.createAggregate(aggregate).pipe(
      switchMap(() => {
        this._interviewsActions.replaceInterview(aggregate.interview);
        this._cloudSync.markDirty({ kind: 'interview', id: aggregate.interview.id });
        return of(aggregate.interview);
      }),
    );
  }
}

export type { InterviewId };

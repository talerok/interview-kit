import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, map, of, switchMap, tap } from 'rxjs';
import { CloudSyncService } from '../../../../../../api/cloud';
import { TemplateId } from '../../../../../templates/interfaces/template';
import { TemplateRepo } from '../../../../../templates/models/data/template.repo';
import { Interview, InterviewId } from '../../../../interfaces/interview';
import { InterviewRepo } from '../../../../models/data/interview.repo';
import { InterviewsActions } from '../../../../models/state/interviews.actions';
import { buildNewInterviewAggregate } from '../data/new-interview.factory';
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

import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { CloudSyncService } from '../../../../api/cloud';
import { Interview, InterviewId } from '../../interfaces/interview';
import { InterviewRepo } from '../data/interview.repo';
import { InterviewsStore } from './interviews.store';

@Injectable({ providedIn: 'root' })
export class InterviewsActions {
  private readonly _store = inject(InterviewsStore);
  private readonly _repo = inject(InterviewRepo);
  private readonly _cloudSync = inject(CloudSyncService);

  load(): Observable<readonly Interview[]> {
    return this._repo.list().pipe(tap((items) => this._store.set(items)));
  }

  replaceInterview(interview: Interview): void {
    this._store.upsert(interview, (i) => i.id);
    this._cloudSync.markDirty({ kind: 'interview', id: interview.id });
  }

  delete(id: InterviewId): Observable<void> {
    return this._repo.delete(id).pipe(
      tap(() => {
        this._store.removeBy((i) => i.id === id);
        this._cloudSync.markDeleted({ kind: 'interview', id });
      }),
      map(() => undefined),
    );
  }
}

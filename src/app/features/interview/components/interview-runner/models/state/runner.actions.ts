import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, map, tap } from 'rxjs';
import { CloudSyncService } from '../../../../../../api/cloud';

const MS_PER_MINUTE = 60_000;
import {
  Answer,
  AnswerScore,
  Interview,
  InterviewAggregate,
  InterviewId,
} from '../../../../interfaces/interview';
import { InterviewRepo } from '../../../../models/data/interview.repo';
import { InterviewsActions } from '../../../../models/state/interviews.actions';
import { RunnerStore } from './runner.store';

@Injectable()
export class RunnerActions {
  private readonly _store = inject(RunnerStore);
  private readonly _repo = inject(InterviewRepo);
  private readonly _interviewsActions = inject(InterviewsActions);
  private readonly _cloudSync = inject(CloudSyncService);

  load(id: InterviewId): Observable<InterviewAggregate | null> {
    return this._repo.get(id).pipe(tap((aggregate) => this._store.setAggregate(aggregate)));
  }

  setScore(score: AnswerScore): Observable<void> {
    const next = this._store.patchCurrentAnswer({ score, skipped: false });
    return this._persistAnswer(next);
  }

  clearScore(): Observable<void> {
    const next = this._store.patchCurrentAnswer({ score: null });
    return this._persistAnswer(next);
  }

  setComment(comment: string): Observable<void> {
    const next = this._store.patchCurrentAnswer({ comment });
    return this._persistAnswer(next);
  }

  skipCurrent(): Observable<void> {
    const next = this._store.patchCurrentAnswer({ skipped: true, score: null });
    return this._persistAnswer(next);
  }

  goToIndex(idx: number): void {
    this._store.setIndex(idx);
  }

  prev(): void {
    this._store.setIndex(this._store.idx() - 1);
  }

  next(): void {
    this._store.setIndex(this._store.idx() + 1);
  }

  finish(): Observable<Interview> {
    const interview = this._store.interview();
    if (interview === null) return EMPTY;
    const durationMin = this._computeDuration();
    const updated: Interview = {
      ...interview,
      status: 'completed',
      durationMin,
    };
    return this._repo.updateInterview(updated).pipe(
      tap((saved) => this._afterInterviewChange(saved)),
    );
  }

  cancel(): Observable<Interview> {
    const interview = this._store.interview();
    if (interview === null) return EMPTY;
    const updated: Interview = { ...interview, status: 'cancelled' };
    return this._repo.updateInterview(updated).pipe(
      tap((saved) => this._afterInterviewChange(saved)),
    );
  }

  updateNotes(notes: string): Observable<void> {
    const interview = this._store.interview();
    if (interview === null) return EMPTY;
    const updated: Interview = { ...interview, notes };
    return this._repo.updateInterview(updated).pipe(
      tap((saved) => this._afterInterviewChange(saved)),
      map(() => undefined),
    );
  }

  private _persistAnswer(answer: Answer | null): Observable<void> {
    if (answer === null) return EMPTY;
    return this._repo.updateAnswer(answer).pipe(
      tap(({ interview }) => this._afterInterviewChange(interview)),
      map(() => undefined),
    );
  }

  private _afterInterviewChange(interview: Interview): void {
    this._store.replaceInterview(interview);
    this._interviewsActions.replaceInterview(interview);
    this._cloudSync.markDirty({ kind: 'interview', id: interview.id });
  }

  private _computeDuration(): number {
    const started = this._store.startedAt();
    return Math.max(1, Math.round((Date.now() - started) / MS_PER_MINUTE));
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { TemplateRepo } from '../../../templates/models/data/template.repo';
import { InterviewRepo } from '../../../interview/models/data/interview.repo';
import { InterviewId } from '../../../interview/interfaces/interview';
import { ResultStore } from './result.store';

@Injectable()
export class ResultActions {
  private readonly _store = inject(ResultStore);
  private readonly _interviewRepo = inject(InterviewRepo);
  private readonly _templateRepo = inject(TemplateRepo);

  load(id: InterviewId): Observable<void> {
    return this._interviewRepo.get(id).pipe(
      switchMap((interview) => {
        if (interview === null) {
          this._store.set(null, null);
          return of(undefined);
        }
        return this._templateRepo.get(interview.interview.templateId).pipe(
          tap((template) => this._store.set(interview, template)),
          map(() => undefined),
        );
      }),
    );
  }
}

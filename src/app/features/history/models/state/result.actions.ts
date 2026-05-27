import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, from, map, of, switchMap, tap } from 'rxjs';
import { TemplateRepo } from '../../../templates/models/data/template.repo';
import { InterviewRepo } from '../../../interview/models/data/interview.repo';
import { InterviewId } from '../../../interview/interfaces/interview';
import { ResultPdfGenerator } from '../data/result-pdf.generator';
import { ResultStore } from './result.store';

@Injectable()
export class ResultActions {
  private readonly _store = inject(ResultStore);
  private readonly _interviewRepo = inject(InterviewRepo);
  private readonly _templateRepo = inject(TemplateRepo);
  private readonly _pdf = inject(ResultPdfGenerator);

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

  exportPdf(): Observable<void> {
    const interview = this._store.interview();
    if (interview === null) return EMPTY;
    return from(
      this._pdf.download({
        interview,
        template: this._store.template(),
        categories: this._store.categories(),
        answers: this._store.answers(),
        avg: this._store.avg(),
        distribution: this._store.distribution(),
        answeredCount: this._store.answeredCount(),
        skippedCount: this._store.skippedCount(),
        categoryAverages: this._store.categoryAverages(),
      }),
    );
  }
}

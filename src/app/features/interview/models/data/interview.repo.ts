import { Injectable, inject } from '@angular/core';
import { Observable, defer } from 'rxjs';
import { Transaction, promisifyRequest } from 'idxdb-utils';
import {
  AnswerDto,
  AppDb,
  INDEXES,
  InterviewDto,
  STORES,
  TombstoneDto,
  tombstoneKey,
} from '../../../../api/storage';
import {
  Answer,
  Interview,
  InterviewAggregate,
  InterviewId,
} from '../../interfaces/interview';

interface AnswerStats {
  readonly answeredCount: number;
  readonly skippedCount: number;
  readonly avg: number;
}

const computeStats = (answers: readonly AnswerDto[]): AnswerStats => {
  let answered = 0;
  let skipped = 0;
  let sum = 0;
  for (const a of answers) {
    if (a.skipped) {
      skipped += 1;
      continue;
    }
    if (a.score !== null) {
      answered += 1;
      sum += a.score;
    }
  }
  return {
    answeredCount: answered,
    skippedCount: skipped,
    avg: answered === 0 ? 0 : sum / answered,
  };
};
import {
  toAnswer,
  toAnswerDto,
  toInterview,
  toInterviewDto,
} from './interview.mapper';

@Injectable({ providedIn: 'root' })
export class InterviewRepo {
  private readonly _appDb = inject(AppDb);

  list(): Observable<readonly Interview[]> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(STORES.interviews, 'readonly');
      const dtos = await tx.objectStore<InterviewDto>(STORES.interviews).getAll();
      await tx.done;
      return dtos.map(toInterview);
    });
  }

  get(id: InterviewId): Observable<InterviewAggregate | null> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.interviews, STORES.answers],
        'readonly',
      );
      const interviewDto = await tx.objectStore<InterviewDto>(STORES.interviews).get(id);
      if (!interviewDto) {
        await tx.done;
        return null;
      }
      const answersDto = await promisifyRequest<AnswerDto[]>(
        tx.objectStore<AnswerDto>(STORES.answers).raw.index(INDEXES.answers.byInterview).getAll(id),
      );
      await tx.done;
      return {
        interview: toInterview(interviewDto),
        answers: answersDto.map(toAnswer).sort((a, b) => a.order - b.order),
      };
    });
  }

  createAggregate(aggregate: InterviewAggregate): Observable<void> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.interviews, STORES.answers],
        'readwrite',
      );
      await tx.objectStore<InterviewDto>(STORES.interviews).put(toInterviewDto(aggregate.interview));
      const answersStore = tx.objectStore<AnswerDto>(STORES.answers);
      for (const a of aggregate.answers) {
        await answersStore.put(toAnswerDto(a));
      }
      await tx.done;
    });
  }

  updateAnswer(answer: Answer): Observable<{ interview: Interview; answer: Answer }> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.interviews, STORES.answers],
        'readwrite',
      );
      await tx.objectStore<AnswerDto>(STORES.answers).put(toAnswerDto(answer));
      const all = await promisifyRequest<AnswerDto[]>(
        tx
          .objectStore<AnswerDto>(STORES.answers)
          .raw.index(INDEXES.answers.byInterview)
          .getAll(answer.interviewId),
      );
      const stats = computeStats(all);
      const next = await this._bumpInterview(tx, answer.interviewId, (current) => ({
        ...current,
        ...stats,
      }));
      await tx.done;
      return { interview: toInterview(next), answer };
    });
  }

  updateInterview(interview: Interview): Observable<Interview> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(STORES.interviews, 'readwrite');
      const next = await this._bumpInterview(tx, interview.id, () => toInterviewDto(interview));
      await tx.done;
      return toInterview(next);
    });
  }

  delete(id: InterviewId): Observable<void> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.interviews, STORES.answers, STORES.tombstones],
        'readwrite',
      );
      const current = await tx.objectStore<InterviewDto>(STORES.interviews).get(id);

      const answersStore = tx.objectStore<AnswerDto>(STORES.answers);
      const keys = await promisifyRequest<IDBValidKey[]>(
        answersStore.raw.index(INDEXES.answers.byInterview).getAllKeys(id),
      );
      for (const k of keys) await answersStore.delete(k);
      await tx.objectStore<InterviewDto>(STORES.interviews).delete(id);

      if (current) {
        const tombstone: TombstoneDto = {
          key: tombstoneKey('interview', id),
          kind: 'interview',
          id,
          rev: current.rev + 1,
          deletedAt: new Date().toISOString(),
        };
        await tx.objectStore<TombstoneDto>(STORES.tombstones).put(tombstone);
      }

      await tx.done;
    });
  }

  private async _bumpInterview(
    tx: Transaction,
    id: InterviewId,
    mutate: (current: InterviewDto) => InterviewDto,
  ): Promise<InterviewDto> {
    const current = await tx.objectStore<InterviewDto>(STORES.interviews).get(id);
    if (!current) {
      throw new Error(`Interview ${id} not found`);
    }
    const next: InterviewDto = {
      ...mutate(current),
      rev: current.rev + 1,
      updatedAt: new Date().toISOString(),
    };
    await tx.objectStore<InterviewDto>(STORES.interviews).put(next);
    return next;
  }
}

import { Injectable, Signal, computed, signal } from '@angular/core';
import {
  Answer,
  AnswerScore,
  Interview,
  InterviewAggregate,
} from '../../../../interfaces/interview';

@Injectable()
export class RunnerStore {
  private readonly _aggregate = signal<InterviewAggregate | null>(null);
  private readonly _loaded = signal(false);
  private readonly _idx = signal(0);
  private readonly _startedAt = signal<number>(Date.now());

  readonly aggregate = this._aggregate.asReadonly();
  readonly isLoaded = this._loaded.asReadonly();
  readonly idx = this._idx.asReadonly();
  readonly startedAt = this._startedAt.asReadonly();

  readonly interview: Signal<Interview | null> = computed(
    () => this._aggregate()?.interview ?? null,
  );
  readonly answers: Signal<readonly Answer[]> = computed(
    () => this._aggregate()?.answers ?? [],
  );
  readonly currentAnswer: Signal<Answer | null> = computed(() => {
    const list = this.answers();
    const i = this._idx();
    return list[i] ?? null;
  });

  readonly answeredCount = computed(
    () => this.answers().filter((a) => a.score !== null && !a.skipped).length,
  );
  readonly skippedCount = computed(() => this.answers().filter((a) => a.skipped).length);
  readonly totalCount = computed(() => this.answers().length);

  readonly progressPercent = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.round(((this.answeredCount() + this.skippedCount()) / total) * 100);
  });

  readonly canPrev = computed(() => this._idx() > 0);
  readonly canNext = computed(() => this._idx() < this.totalCount() - 1);

  setAggregate(value: InterviewAggregate | null): void {
    this._aggregate.set(value);
    this._loaded.set(true);
    this._idx.set(0);
    this._startedAt.set(Date.now());
  }

  setIndex(value: number): void {
    const total = this.totalCount();
    if (total === 0) return;
    this._idx.set(Math.max(0, Math.min(total - 1, value)));
  }

  replaceInterview(interview: Interview): void {
    this._aggregate.update((a) => (a ? { ...a, interview } : a));
  }

  replaceAnswer(answer: Answer): void {
    this._aggregate.update((a) =>
      a
        ? {
            ...a,
            answers: a.answers.map((x) => (x.id === answer.id ? answer : x)),
          }
        : a,
    );
  }

  patchCurrentAnswer(patch: { score?: AnswerScore | null; comment?: string; skipped?: boolean }): Answer | null {
    const current = this.currentAnswer();
    if (current === null) return null;
    const next: Answer = {
      ...current,
      score: patch.score !== undefined ? patch.score : current.score,
      comment: patch.comment !== undefined ? patch.comment : current.comment,
      skipped: patch.skipped !== undefined ? patch.skipped : current.skipped,
    };
    this.replaceAnswer(next);
    return next;
  }
}

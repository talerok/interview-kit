import { Injectable, Signal, computed, signal } from '@angular/core';
import { avgScore, scoreBand, scoreDistribution } from '../../../../shared/utils';
import {
  Category,
  Template,
  TemplateAggregate,
} from '../../../templates/interfaces/template';
import {
  Answer,
  Interview,
  InterviewAggregate,
} from '../../../interview/interfaces/interview';

export interface CategoryAverage {
  readonly category: Category;
  readonly avg: number;
  readonly count: number;
}

@Injectable()
export class ResultStore {
  private readonly _interview = signal<InterviewAggregate | null>(null);
  private readonly _template = signal<TemplateAggregate | null>(null);
  private readonly _loaded = signal(false);

  readonly interviewAggregate = this._interview.asReadonly();
  readonly templateAggregate = this._template.asReadonly();
  readonly isLoaded = this._loaded.asReadonly();

  readonly interview: Signal<Interview | null> = computed(
    () => this._interview()?.interview ?? null,
  );
  readonly template: Signal<Template | null> = computed(
    () => this._template()?.template ?? null,
  );
  readonly answers: Signal<readonly Answer[]> = computed(
    () => this._interview()?.answers ?? [],
  );
  readonly categories: Signal<readonly Category[]> = computed(
    () => this._template()?.categories ?? [],
  );

  readonly avg = computed(() => avgScore(this.answers()));
  readonly band = computed(() => scoreBand(this.avg()));
  readonly distribution = computed(() => scoreDistribution(this.answers()));

  readonly answeredCount = computed(
    () => this.answers().filter((a) => a.score !== null && !a.skipped).length,
  );
  readonly skippedCount = computed(() => this.answers().filter((a) => a.skipped).length);

  readonly categoryAverages: Signal<readonly CategoryAverage[]> = computed(() => {
    const cats = this.categories();
    if (cats.length === 0) {
      return [];
    }
    const buckets = new Map<string, { sum: number; n: number }>();
    for (const a of this.answers()) {
      if (a.skipped || a.score === null || a.categoryId === null) continue;
      const existing = buckets.get(a.categoryId) ?? { sum: 0, n: 0 };
      existing.sum += a.score;
      existing.n += 1;
      buckets.set(a.categoryId, existing);
    }
    return cats.map((c) => {
      const b = buckets.get(c.id);
      return {
        category: c,
        avg: b && b.n > 0 ? b.sum / b.n : 0,
        count: b?.n ?? 0,
      };
    });
  });

  set(interview: InterviewAggregate | null, template: TemplateAggregate | null): void {
    this._interview.set(interview);
    this._template.set(template);
    this._loaded.set(true);
  }
}

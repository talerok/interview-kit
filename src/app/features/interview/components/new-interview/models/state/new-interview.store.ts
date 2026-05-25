import { Injectable, Signal, computed, signal } from '@angular/core';
import { CategoryId, TemplateAggregate, TemplateId } from '../../../../../templates/interfaces/template';
import { CandidateInfo } from '../../../../interfaces/interview';

const DEFAULT_COUNT = 8;

const today = (): string => new Date().toISOString().slice(0, 10);

const initialCandidate = (): CandidateInfo => ({
  name: '',
  position: '',
  date: today(),
});

@Injectable()
export class NewInterviewStore {
  private readonly _templateId = signal<TemplateId | null>(null);
  private readonly _aggregate = signal<TemplateAggregate | null>(null);
  private readonly _count = signal(DEFAULT_COUNT);
  private readonly _activeCategoryIds = signal<readonly CategoryId[] | null>(null);
  private readonly _candidate = signal<CandidateInfo>(initialCandidate());

  readonly templateId = this._templateId.asReadonly();
  readonly aggregate = this._aggregate.asReadonly();
  readonly count = this._count.asReadonly();
  readonly activeCategoryIds = this._activeCategoryIds.asReadonly();
  readonly candidate = this._candidate.asReadonly();

  readonly categories = computed(() => this._aggregate()?.categories ?? []);
  readonly allQuestions = computed(() => this._aggregate()?.questions ?? []);

  readonly effectiveActiveCategoryIds: Signal<readonly CategoryId[]> = computed(() => {
    const explicit = this._activeCategoryIds();
    if (explicit !== null) {
      return explicit;
    }
    return this.categories().map((c) => c.id);
  });

  readonly filteredQuestions = computed(() => {
    const active = new Set(this.effectiveActiveCategoryIds());
    return this.allQuestions().filter(
      (q) => q.categoryId !== null && active.has(q.categoryId),
    );
  });

  readonly availableCount = computed(() => this.filteredQuestions().length);

  readonly effectiveCount = computed(() => Math.min(this._count(), this.availableCount()));

  readonly canStart = computed(() => {
    const hasTemplate = this._aggregate() !== null;
    const hasName = this._candidate().name.trim().length > 0;
    const enoughQuestions = this.effectiveCount() > 0;
    return hasTemplate && hasName && enoughQuestions;
  });

  setTemplateId(id: TemplateId | null): void {
    this._templateId.set(id);
    this._aggregate.set(null);
    this._activeCategoryIds.set(null);
  }

  setAggregate(aggregate: TemplateAggregate | null): void {
    this._aggregate.set(aggregate);
    this._activeCategoryIds.set(null);
  }

  setCount(value: number): void {
    this._count.set(Math.max(1, value));
  }

  toggleCategory(id: CategoryId): void {
    const all = this.categories().map((c) => c.id);
    const current = this._activeCategoryIds() ?? all;
    const set = new Set(current);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    const next = all.filter((c) => set.has(c));
    this._activeCategoryIds.set(next);
  }

  toggleAllCategories(): void {
    const all = this.categories().map((c) => c.id);
    const current = this._activeCategoryIds() ?? all;
    const next = current.length === all.length ? [] : all;
    this._activeCategoryIds.set(next);
  }

  updateCandidate(patch: Partial<CandidateInfo>): void {
    this._candidate.update((c) => ({ ...c, ...patch }));
  }
}

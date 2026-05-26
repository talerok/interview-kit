import { Injectable, Signal, computed, signal } from '@angular/core';
import {
  CategoryId,
  Question,
  TemplateAggregate,
  TemplateId,
} from '../../../../../templates/interfaces/template';
import { CandidateInfo } from '../../../../interfaces/interview';

export type PickMode = 'random' | 'first';
export type RunOrder = 'sequential' | 'shuffled';

export interface CategoryPick {
  readonly categoryId: CategoryId;
  readonly enabled: boolean;
  readonly count: number;
  readonly mode: PickMode;
}

const DEFAULT_PER_CATEGORY = 4;

const today = (): string => new Date().toISOString().slice(0, 10);

const initialCandidate = (): CandidateInfo => ({
  name: '',
  position: '',
  date: today(),
});

const questionsByCategory = (
  questions: readonly Question[],
): Map<CategoryId, readonly Question[]> => {
  const out = new Map<CategoryId, Question[]>();
  for (const q of questions) {
    if (q.categoryId === null) continue;
    const bucket = out.get(q.categoryId);
    if (bucket === undefined) out.set(q.categoryId, [q]);
    else bucket.push(q);
  }
  return out;
};

@Injectable()
export class NewInterviewStore {
  private readonly _templateId = signal<TemplateId | null>(null);
  private readonly _aggregate = signal<TemplateAggregate | null>(null);
  private readonly _picks = signal<readonly CategoryPick[]>([]);
  private readonly _runOrder = signal<RunOrder>('sequential');
  private readonly _candidate = signal<CandidateInfo>(initialCandidate());

  readonly templateId = this._templateId.asReadonly();
  readonly aggregate = this._aggregate.asReadonly();
  readonly picks = this._picks.asReadonly();
  readonly runOrder = this._runOrder.asReadonly();
  readonly candidate = this._candidate.asReadonly();

  readonly categories = computed(() => this._aggregate()?.categories ?? []);
  readonly allQuestions = computed(() => this._aggregate()?.questions ?? []);

  readonly questionsByCategory: Signal<Map<CategoryId, readonly Question[]>> = computed(() =>
    questionsByCategory(this.allQuestions()),
  );

  /** All questions belonging to enabled picks, in pick-row order, ignoring quotas. */
  readonly availableInEnabled = computed(() => {
    const buckets = this.questionsByCategory();
    let total = 0;
    for (const p of this._picks()) {
      if (!p.enabled) continue;
      total += buckets.get(p.categoryId)?.length ?? 0;
    }
    return total;
  });

  /** How many questions of `categoryId` actually exist (used for clamping). */
  availableInCategory(categoryId: CategoryId): number {
    return this.questionsByCategory().get(categoryId)?.length ?? 0;
  }

  effectivePickCount(pick: CategoryPick): number {
    if (!pick.enabled) return 0;
    return Math.min(pick.count, this.availableInCategory(pick.categoryId));
  }

  /** Total number of questions that will end up in the interview. */
  readonly effectiveTotal: Signal<number> = computed(() => {
    let total = 0;
    for (const p of this._picks()) total += this.effectivePickCount(p);
    return total;
  });

  readonly canStart = computed(() => {
    const hasTemplate = this._aggregate() !== null;
    const hasName = this._candidate().name.trim().length > 0;
    return hasTemplate && hasName && this.effectiveTotal() > 0;
  });

  setTemplateId(id: TemplateId | null): void {
    this._templateId.set(id);
    this._aggregate.set(null);
    this._picks.set([]);
  }

  setAggregate(aggregate: TemplateAggregate | null): void {
    this._aggregate.set(aggregate);
    if (aggregate === null) {
      this._picks.set([]);
      return;
    }
    const sorted = aggregate.categories.slice().sort((a, b) => a.order - b.order);
    const buckets = questionsByCategory(aggregate.questions);
    const picks = sorted.map<CategoryPick>((c) => ({
      categoryId: c.id,
      enabled: true,
      count: Math.min(DEFAULT_PER_CATEGORY, buckets.get(c.id)?.length ?? 0),
      mode: 'random',
    }));
    this._picks.set(picks);
  }

  setEnabled(categoryId: CategoryId, enabled: boolean): void {
    this._picks.update((picks) =>
      picks.map((p) => (p.categoryId === categoryId ? { ...p, enabled } : p)),
    );
  }

  toggleAll(): void {
    const picks = this._picks();
    const allOn = picks.every((p) => p.enabled);
    this._picks.set(picks.map((p) => ({ ...p, enabled: !allOn })));
  }

  setPickCount(categoryId: CategoryId, value: number): void {
    this._picks.update((picks) =>
      picks.map((p) => {
        if (p.categoryId !== categoryId) return p;
        const max = this.availableInCategory(categoryId);
        const clamped = Math.max(0, Math.min(value, max));
        return { ...p, count: clamped };
      }),
    );
  }

  setPickMode(categoryId: CategoryId, mode: PickMode): void {
    this._picks.update((picks) =>
      picks.map((p) => (p.categoryId === categoryId ? { ...p, mode } : p)),
    );
  }

  reorderPicks(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    this._picks.update((picks) => {
      const next = picks.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  setRunOrder(value: RunOrder): void {
    this._runOrder.set(value);
  }

  updateCandidate(patch: Partial<CandidateInfo>): void {
    this._candidate.update((c) => ({ ...c, ...patch }));
  }
}

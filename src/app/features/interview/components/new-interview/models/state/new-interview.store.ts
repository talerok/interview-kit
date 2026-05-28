import { Injectable, Signal, computed, signal } from '@angular/core';
import { mutateSignal } from '../../../../../../shared/utils';
import {
  Category,
  CategoryId,
  Question,
  TemplateAggregate,
  TemplateId,
} from '../../../../../templates/interfaces/template';
import { CandidateInfo } from '../../../../interfaces/interview';
import {
  buildPickRows,
  groupQuestionsByCategory,
  indexCategories,
  seedPicks,
} from '../data/new-interview.mapper';

export type PickMode = 'random' | 'first';
export type RunOrder = 'sequential' | 'shuffled';

export interface CategoryPick {
  readonly categoryId: CategoryId;
  readonly enabled: boolean;
  readonly count: number;
  readonly mode: PickMode;
}

/** Render-ready row joining a pick with its category + computed counts. */
export interface PickRow {
  readonly pick: CategoryPick;
  readonly category: Category;
  readonly available: number;
  readonly effective: number;
}

export type QuestionsByCategory = Readonly<Record<string, readonly Question[]>>;

const today = (): string => {
  return new Date().toISOString().slice(0, 10);
};

const initialCandidate = (): CandidateInfo => ({
  name: '',
  position: '',
  date: today(),
});

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

  /** Plain immutable record so consumers don't carry a Map through signals. */
  readonly questionsByCategory: Signal<QuestionsByCategory> = computed(() =>
    groupQuestionsByCategory(this.allQuestions()),
  );

  /** Pick rows joined with their category + counts, ready for the UI. */
  readonly pickRows: Signal<readonly PickRow[]> = computed(() =>
    buildPickRows(this._picks(), indexCategories(this.categories()), this.questionsByCategory()),
  );

  /** Total number of questions that will end up in the interview. */
  readonly effectiveTotal: Signal<number> = computed(() =>
    this.pickRows().reduce((sum, row) => sum + row.effective, 0),
  );

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
    this._picks.set(aggregate === null ? [] : seedPicks(aggregate));
  }

  setEnabled(categoryId: CategoryId, enabled: boolean): void {
    mutateSignal(this._picks, (draft) => {
      const p = draft.find((x) => x.categoryId === categoryId);
      if (p) p.enabled = enabled;
    });
  }

  toggleAll(): void {
    const allOn = this._picks().every((p) => p.enabled);
    mutateSignal(this._picks, (draft) => {
      for (const p of draft) p.enabled = !allOn;
    });
  }

  setPickCount(categoryId: CategoryId, value: number): void {
    const max = this.questionsByCategory()[categoryId]?.length ?? 0;
    const clamped = Math.max(0, Math.min(value, max));
    mutateSignal(this._picks, (draft) => {
      const p = draft.find((x) => x.categoryId === categoryId);
      if (p) p.count = clamped;
    });
  }

  setPickMode(categoryId: CategoryId, mode: PickMode): void {
    mutateSignal(this._picks, (draft) => {
      const p = draft.find((x) => x.categoryId === categoryId);
      if (p) p.mode = mode;
    });
  }

  reorderPicks(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    mutateSignal(this._picks, (draft) => {
      const [moved] = draft.splice(fromIndex, 1);
      draft.splice(toIndex, 0, moved);
    });
  }

  setRunOrder(value: RunOrder): void {
    this._runOrder.set(value);
  }

  updateCandidate(patch: Partial<CandidateInfo>): void {
    mutateSignal(this._candidate, (draft) => {
      Object.assign(draft, patch);
    });
  }
}

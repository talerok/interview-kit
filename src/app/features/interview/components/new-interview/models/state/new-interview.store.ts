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

type QuestionsByCategory = Readonly<Record<string, readonly Question[]>>;

/** Sentinel "categoryId" for questions whose `Question.categoryId` is null.
 *  Lets pick rows treat uncategorized questions like any other category. */
export const UNCATEGORIZED_KEY = 'uncategorized' as const;

const UNCATEGORIZED_CATEGORY: Category = {
  id: UNCATEGORIZED_KEY as CategoryId,
  templateId: '' as TemplateId,
  label: 'Без категории',
  color: 'var(--fg-faint)',
  order: Number.MAX_SAFE_INTEGER,
};

const DEFAULT_PER_CATEGORY = 4;

const today = (): string => new Date().toISOString().slice(0, 10);

const initialCandidate = (): CandidateInfo => ({
  name: '',
  position: '',
  date: today(),
});

const groupQuestionsByCategory = (questions: readonly Question[]): QuestionsByCategory => {
  const out: Record<string, Question[]> = {};
  for (const q of questions) {
    const key = q.categoryId ?? UNCATEGORIZED_KEY;
    (out[key] ??= []).push(q);
  }
  return out;
};

const indexCategories = (categories: readonly Category[]): Record<string, Category> => {
  const out: Record<string, Category> = {};
  for (const c of categories) out[c.id] = c;
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

  /** Plain immutable record so consumers don't carry a Map through signals. */
  readonly questionsByCategory: Signal<QuestionsByCategory> = computed(() =>
    groupQuestionsByCategory(this.allQuestions()),
  );

  /** Pick rows joined with their category + counts, ready for the UI. */
  readonly pickRows: Signal<readonly PickRow[]> = computed(() => this._buildPickRows());

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
    this._picks.set(aggregate === null ? [] : this._seedPicks(aggregate));
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
    const max = this._availableInCategory(categoryId);
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

  private _buildPickRows(): readonly PickRow[] {
    const picks = this._picks();
    const categoryById = indexCategories(this.categories());
    const buckets = this.questionsByCategory();
    const rows: PickRow[] = [];
    for (const pick of picks) {
      const category =
        pick.categoryId === UNCATEGORIZED_KEY
          ? UNCATEGORIZED_CATEGORY
          : categoryById[pick.categoryId];
      if (category === undefined) continue;
      const available = buckets[pick.categoryId]?.length ?? 0;
      const effective = pick.enabled ? Math.min(pick.count, available) : 0;
      rows.push({ pick, category, available, effective });
    }
    return rows;
  }

  private _seedPicks(aggregate: TemplateAggregate): readonly CategoryPick[] {
    const sorted = aggregate.categories.slice().sort((a, b) => a.order - b.order);
    const buckets = groupQuestionsByCategory(aggregate.questions);
    const picks: CategoryPick[] = sorted.map((c) => ({
      categoryId: c.id,
      enabled: true,
      count: Math.min(DEFAULT_PER_CATEGORY, buckets[c.id]?.length ?? 0),
      mode: 'random',
    }));
    const uncategorizedCount = buckets[UNCATEGORIZED_KEY]?.length ?? 0;
    if (uncategorizedCount > 0) {
      picks.push({
        categoryId: UNCATEGORIZED_KEY as CategoryId,
        enabled: true,
        count: Math.min(DEFAULT_PER_CATEGORY, uncategorizedCount),
        mode: 'random',
      });
    }
    return picks;
  }

  private _availableInCategory(categoryId: CategoryId): number {
    return this.questionsByCategory()[categoryId]?.length ?? 0;
  }
}

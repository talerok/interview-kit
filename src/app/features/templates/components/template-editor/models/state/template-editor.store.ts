import { Injectable, Signal, computed, signal } from '@angular/core';
import { mutateSignal } from '../../../../../../shared/utils';
import {
  Category,
  CategoryId,
  Question,
  QuestionId,
  Template,
  TemplateAggregate,
} from '../../../../interfaces/template';

export type EditingTarget = QuestionId | 'new' | null;

@Injectable()
export class TemplateEditorStore {
  private readonly _aggregate = signal<TemplateAggregate | null>(null);
  private readonly _loaded = signal(false);
  private readonly _filter = signal<CategoryId | null>(null);
  private readonly _editing = signal<EditingTarget>(null);

  readonly aggregate = this._aggregate.asReadonly();
  readonly isLoaded = this._loaded.asReadonly();
  readonly filter = this._filter.asReadonly();
  readonly editing = this._editing.asReadonly();

  readonly template: Signal<Template | null> = computed(() => {
    return this._aggregate()?.template ?? null;
  });
  readonly categories: Signal<readonly Category[]> = computed(() => {
    return this._aggregate()?.categories ?? [];
  });
  readonly questions: Signal<readonly Question[]> = computed(() => {
    return this._aggregate()?.questions ?? [];
  });

  readonly filteredQuestions: Signal<readonly Question[]> = computed(() => {
    const all = this.questions();
    const filter = this._filter();
    if (filter === null) return all;
    return all.filter((q) => q.categoryId === filter);
  });

  /** Lookup by id as an immutable record (avoids Signal<Map<>>). */
  readonly categoryById: Signal<Readonly<Record<string, Category>>> = computed(() =>
    indexById(this.categories()),
  );

  readonly questionCountByCategory: Signal<Readonly<Record<string, number>>> = computed(() =>
    countByCategory(this.questions()),
  );

  setAggregate(value: TemplateAggregate | null): void {
    this._aggregate.set(value);
    this._loaded.set(true);
    this._filter.set(null);
    this._editing.set(null);
  }

  replaceTemplate(template: Template): void {
    mutateSignal(this._aggregate, (draft) => {
      draft.template = template;
    });
  }

  addCategory(category: Category): void {
    mutateSignal(this._aggregate, (draft) => {
      draft.categories.push(category);
    });
  }

  updateCategory(category: Category): void {
    mutateSignal(this._aggregate, (draft) => {
      const i = draft.categories.findIndex((c) => c.id === category.id);
      if (i >= 0) draft.categories[i] = category;
    });
  }

  removeCategory(id: CategoryId): void {
    mutateSignal(this._aggregate, (draft) => {
      draft.categories = draft.categories.filter((c) => c.id !== id);
      for (const q of draft.questions) {
        if (q.categoryId === id) q.categoryId = null;
      }
    });
    if (this._filter() === id) {
      this._filter.set(null);
    }
  }

  addQuestion(question: Question): void {
    mutateSignal(this._aggregate, (draft) => {
      draft.questions.push(question);
    });
  }

  updateQuestion(question: Question): void {
    mutateSignal(this._aggregate, (draft) => {
      const i = draft.questions.findIndex((q) => q.id === question.id);
      if (i >= 0) draft.questions[i] = question;
    });
  }

  removeQuestion(id: QuestionId): void {
    mutateSignal(this._aggregate, (draft) => {
      draft.questions = draft.questions.filter((q) => q.id !== id);
    });
  }

  /**
   * Re-stamp every question's `order` field so the in-memory list matches the
   * supplied sequence. Used after a drag-and-drop reorder; the new order has
   * already been persisted to IDB by the action.
   */
  reorderQuestions(orderedIds: readonly QuestionId[]): void {
    const indexById = new Map(orderedIds.map((id, i) => [id, i]));
    const fallback = orderedIds.length;
    mutateSignal(this._aggregate, (draft) => {
      for (const q of draft.questions) {
        q.order = indexById.get(q.id) ?? fallback;
      }
      draft.questions.sort((a, b) => a.order - b.order);
    });
  }

  setFilter(value: CategoryId | null): void {
    this._filter.set(value);
  }

  startAdding(): void {
    this._editing.set('new');
  }

  startEditing(target: EditingTarget): void {
    this._editing.set(target);
  }

  cancelEditing(): void {
    this._editing.set(null);
  }
}

const indexById = (categories: readonly Category[]): Readonly<Record<string, Category>> => {
  const out: Record<string, Category> = {};
  for (const c of categories) out[c.id] = c;
  return out;
};

const countByCategory = (questions: readonly Question[]): Readonly<Record<string, number>> => {
  const out: Record<string, number> = {};
  for (const q of questions) {
    if (q.categoryId === null) continue;
    out[q.categoryId] = (out[q.categoryId] ?? 0) + 1;
  }
  return out;
};

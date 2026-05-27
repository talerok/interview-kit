import { Injectable, Signal, computed, signal } from '@angular/core';
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

  readonly template: Signal<Template | null> = computed(() => this._aggregate()?.template ?? null);
  readonly categories: Signal<readonly Category[]> = computed(
    () => this._aggregate()?.categories ?? [],
  );
  readonly questions: Signal<readonly Question[]> = computed(
    () => this._aggregate()?.questions ?? [],
  );

  readonly filteredQuestions: Signal<readonly Question[]> = computed(() => {
    const all = this.questions();
    const filter = this._filter();
    if (filter === null) {
      return all;
    }
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
    this._aggregate.update((a) => (a ? { ...a, template } : a));
  }

  addCategory(category: Category): void {
    this._aggregate.update((a) =>
      a ? { ...a, categories: [...a.categories, category] } : a,
    );
  }

  updateCategory(category: Category): void {
    this._aggregate.update((a) =>
      a
        ? {
            ...a,
            categories: a.categories.map((c) => (c.id === category.id ? category : c)),
          }
        : a,
    );
  }

  removeCategory(id: CategoryId): void {
    this._aggregate.update((a) =>
      a
        ? {
            ...a,
            categories: a.categories.filter((c) => c.id !== id),
            questions: a.questions.map((q) =>
              q.categoryId === id ? { ...q, categoryId: null } : q,
            ),
          }
        : a,
    );
    if (this._filter() === id) {
      this._filter.set(null);
    }
  }

  addQuestion(question: Question): void {
    this._aggregate.update((a) =>
      a ? { ...a, questions: [...a.questions, question] } : a,
    );
  }

  updateQuestion(question: Question): void {
    this._aggregate.update((a) =>
      a
        ? {
            ...a,
            questions: a.questions.map((q) => (q.id === question.id ? question : q)),
          }
        : a,
    );
  }

  removeQuestion(id: QuestionId): void {
    this._aggregate.update((a) =>
      a ? { ...a, questions: a.questions.filter((q) => q.id !== id) } : a,
    );
  }

  /**
   * Re-stamp every question's `order` field so the in-memory list matches the
   * supplied sequence. Used after a drag-and-drop reorder; the new order has
   * already been persisted to IDB by the action.
   */
  reorderQuestions(orderedIds: readonly QuestionId[]): void {
    this._aggregate.update((a) => {
      if (a === null) return a;
      const indexById = new Map(orderedIds.map((id, i) => [id, i]));
      const fallback = orderedIds.length;
      return {
        ...a,
        questions: a.questions
          .map((q) => ({ ...q, order: indexById.get(q.id) ?? fallback }))
          .sort((x, y) => x.order - y.order),
      };
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

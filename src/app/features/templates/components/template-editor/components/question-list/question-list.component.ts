import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../../../../../shared/ui/icon';
import { Category, Question, QuestionId } from '../../../../interfaces/template';
import { TemplateEditorActions } from '../../models/state/template-editor.actions';
import { TemplateEditorStore } from '../../models/state/template-editor.store';
import {
  QuestionDraft,
  QuestionEditorComponent,
} from './components/question-editor/question-editor.component';
import { QuestionRowComponent } from './components/question-row/question-row.component';

interface RenderRow {
  readonly question: Question;
  readonly category: Category | null;
  readonly index: number;
}

@Component({
  selector: 'app-question-list',
  imports: [IconComponent, QuestionRowComponent, QuestionEditorComponent, CdkDropList, CdkDrag],
  templateUrl: './question-list.component.html',
  styleUrl: './question-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionListComponent {
  protected readonly _store = inject(TemplateEditorStore);
  protected readonly _actions = inject(TemplateEditorActions);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _activeCategoryLabel = computed(() => {
    const filter = this._store.filter();
    if (filter === null) {
      return null;
    }
    return this._store.categoryById()[filter]?.label ?? null;
  });

  protected readonly _rows = computed<readonly RenderRow[]>(() => {
    const byId = this._store.categoryById();
    return this._store.filteredQuestions().map((q, index) => ({
      question: q,
      category: q.categoryId ? (byId[q.categoryId] ?? null) : null,
      index,
    }));
  });

  protected readonly _editingQuestion = computed<Question | null>(() => {
    const target = this._store.editing();
    if (target === null || target === 'new') {
      return null;
    }
    return this._store.questions().find((q) => q.id === target) ?? null;
  });

  protected readonly _editingDraft = computed<QuestionDraft | null>(() => {
    const q = this._editingQuestion();
    if (q === null) {
      return null;
    }
    return { text: q.text, categoryId: q.categoryId, weight: q.weight };
  });

  /**
   * Drag-reorder is only available with no active category filter and no
   * editor open — otherwise the visible list isn't a faithful slice of the
   * underlying order, and a drop event can't map cleanly to the full list.
   */
  protected readonly _canReorder = computed(
    () => this._store.filter() === null && this._store.editing() === null,
  );

  protected _onAdd(): void {
    this._actions.startAdding();
  }

  protected _onDrop(event: CdkDragDrop<readonly RenderRow[]>): void {
    if (!this._canReorder()) return;
    if (event.previousIndex === event.currentIndex) return;
    const next = this._rows().slice();
    const { previousIndex, currentIndex } = event;
    moveItemInArray(next, previousIndex, currentIndex);
    const orderedIds = next.map((r) => r.question.id);
    this._actions
      .reorderQuestions(orderedIds)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  protected _onEdit(id: QuestionId): void {
    this._actions.startEditing(id);
  }

  protected _onCancel(): void {
    this._actions.cancelEditing();
  }

  protected _onSaveNew(draft: QuestionDraft): void {
    this._actions
      .addQuestion(draft)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._actions.cancelEditing());
  }

  protected _onSaveEdit(draft: QuestionDraft): void {
    const current = this._editingQuestion();
    if (current === null) {
      return;
    }
    this._actions
      .updateQuestion({ ...current, ...draft })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._actions.cancelEditing());
  }

  protected _onDelete(id: QuestionId): void {
    if (!confirm('Удалить вопрос?')) {
      return;
    }
    this._actions.deleteQuestion(id).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }
}

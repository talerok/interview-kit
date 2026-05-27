import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../../../../../shared/ui/icon';
import { PluralRuPipe } from '../../../../../../shared/pipes';
import { colorFromName } from '../../../../../../shared/utils';
import { Category, CategoryId } from '../../../../interfaces/template';
import { TemplateEditorActions } from '../../models/state/template-editor.actions';
import { TemplateEditorStore } from '../../models/state/template-editor.store';

interface CategoryRow {
  readonly category: Category;
  readonly count: number;
}

@Component({
  selector: 'app-editor-side',
  imports: [IconComponent, PluralRuPipe],
  templateUrl: './editor-side.component.html',
  styleUrl: './editor-side.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorSideComponent {
  protected readonly _store = inject(TemplateEditorStore);
  protected readonly _actions = inject(TemplateEditorActions);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _categoryForms = ['категория', 'категории', 'категорий'] as const;
  protected readonly _questionForms = ['вопрос', 'вопроса', 'вопросов'] as const;

  protected readonly _rows = computed<readonly CategoryRow[]>(() => {
    const counts = this._store.questionCountByCategory();
    return this._store.categories().map((category) => ({
      category,
      count: counts[category.id] ?? 0,
    }));
  });

  protected _selectAll(): void {
    this._actions.setFilter(null);
  }

  protected _selectCategory(id: CategoryId): void {
    this._actions.setFilter(id);
  }

  protected _onAdd(): void {
    const label = prompt('Название категории');
    if (label === null) {
      return;
    }
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      return;
    }
    this._actions
      .addCategory({ label: trimmed, color: colorFromName(trimmed) })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  protected _onRename(category: Category, event: Event): void {
    event.stopPropagation();
    const label = prompt('Переименовать категорию', category.label);
    if (label === null) {
      return;
    }
    const trimmed = label.trim();
    if (trimmed.length === 0 || trimmed === category.label) {
      return;
    }
    this._actions
      .updateCategory({ ...category, label: trimmed })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  protected _onDelete(category: Category, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Удалить категорию «${category.label}»? Вопросы останутся без категории.`)) {
      return;
    }
    this._actions
      .deleteCategory(category.id)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

}

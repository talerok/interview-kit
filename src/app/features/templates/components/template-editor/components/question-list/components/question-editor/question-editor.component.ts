import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { IconComponent } from '../../../../../../../../shared/ui/icon';
import { explicitEffect } from '../../../../../../../../shared/utils';
import {
  Category,
  CategoryId,
  QuestionWeight,
} from '../../../../../../interfaces/template';

export interface QuestionDraft {
  readonly text: string;
  readonly categoryId: CategoryId | null;
  readonly weight: QuestionWeight;
}

interface FormModel {
  readonly text: string;
  readonly categoryId: string;
  readonly weight: QuestionWeight;
}

const NONE = '__none__';

const fromDraft = (draft: QuestionDraft | null): FormModel => ({
  text: draft?.text ?? '',
  categoryId: draft?.categoryId ?? NONE,
  weight: draft?.weight ?? 2,
});

@Component({
  selector: 'app-question-editor',
  imports: [FormField, IconComponent],
  templateUrl: './question-editor.component.html',
  styleUrl: './question-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionEditorComponent {
  readonly mode = input<'new' | 'edit'>('new');
  readonly initial = input<QuestionDraft | null>(null);
  readonly categories = input.required<readonly Category[]>();

  readonly dismissed = output<void>();
  readonly saved = output<QuestionDraft>();

  protected readonly _model = signal<FormModel>(fromDraft(null));

  protected readonly _form = form(this._model, (s) => {
    required(s.text, { message: 'Введите текст вопроса' });
    minLength(s.text, 3, { message: 'Минимум 3 символа' });
  });

  protected readonly _selectedCategory = computed<Category | null>(() => {
    const id = this._model().categoryId;
    if (id === NONE) {
      return null;
    }
    return this.categories().find((c) => c.id === id) ?? null;
  });

  protected readonly _weights: readonly QuestionWeight[] = [1, 2, 3];
  protected readonly _weightHint = computed(() => {
    switch (this._model().weight) {
      case 3:
        return 'Высокий — критичный для роли';
      case 2:
        return 'Средний — стандартный вопрос';
      default:
        return 'Низкий — разогревочный';
    }
  });

  constructor() {
    // Signal-inputs aren't populated yet when the constructor body runs; reading
    // `initial()` here would return null. An explicitEffect re-syncs the model
    // as soon as the input lands (and again if the parent ever swaps drafts).
    explicitEffect([this.initial], ([draft]) => {
      this._model.set(fromDraft(draft));
    });
  }

  protected _setCategory(id: CategoryId | null): void {
    this._model.update((m) => ({ ...m, categoryId: id ?? NONE }));
  }

  protected _setWeight(weight: QuestionWeight): void {
    this._model.update((m) => ({ ...m, weight }));
  }

  protected _onCancel(): void {
    this.dismissed.emit();
  }

  protected _onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    void submit(this._form, async () => {
      const value = this._model();
      this.saved.emit({
        text: value.text,
        categoryId: value.categoryId === NONE ? null : (value.categoryId as CategoryId),
        weight: value.weight,
      });
    });
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { IconComponent } from '../../../../../../../../shared/ui/icon';
import { explicitEffect } from '../../../../../../../../shared/utils';
import {
  Category,
  CategoryId,
  CodeLanguage,
  QuestionKind,
  QuestionWeight,
} from '../../../../../../interfaces/template';

interface DraftBase {
  readonly categoryId: CategoryId | null;
  readonly weight: QuestionWeight;
  readonly criteria: string;
}

export interface VerbalQuestionDraft extends DraftBase {
  readonly kind: 'verbal';
  readonly text: string;
}

export interface CodingQuestionDraft extends DraftBase {
  readonly kind: 'coding';
  readonly title: string;
  readonly description: string;
  readonly language: CodeLanguage;
  readonly starterCode: string;
}

export type QuestionDraft = VerbalQuestionDraft | CodingQuestionDraft;

/** Flat model that holds both kinds' fields so the user can toggle freely. */
interface FormModel {
  readonly kind: QuestionKind;
  readonly categoryId: string;
  readonly weight: QuestionWeight;
  readonly criteria: string;
  // verbal
  readonly text: string;
  // coding
  readonly title: string;
  readonly description: string;
  readonly language: CodeLanguage;
  readonly starterCode: string;
}

const NONE = '__none__';

const EMPTY_MODEL: FormModel = {
  kind: 'verbal',
  categoryId: NONE,
  weight: 2,
  criteria: '',
  text: '',
  title: '',
  description: '',
  language: 'javascript',
  starterCode: '',
};

const fromDraft = (draft: QuestionDraft | null): FormModel => {
  if (draft === null) return EMPTY_MODEL;
  const base = {
    categoryId: draft.categoryId ?? NONE,
    weight: draft.weight,
    criteria: draft.criteria,
  };
  if (draft.kind === 'coding') {
    return {
      ...EMPTY_MODEL,
      ...base,
      kind: 'coding',
      title: draft.title,
      description: draft.description,
      language: draft.language,
      starterCode: draft.starterCode,
    };
  }
  return { ...EMPTY_MODEL, ...base, kind: 'verbal', text: draft.text };
};

const LANGUAGES: readonly { readonly value: CodeLanguage; readonly label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'plain', label: 'Plain' },
];

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

  protected readonly _model = signal<FormModel>(EMPTY_MODEL);
  // Validators are declared for every field unconditionally; only the visible
  // kind's fields are rendered, so hidden errors stay silent. `_canSubmit`
  // below gates the submit button by the active kind.
  protected readonly _form = form(this._model, (s) => {
    required(s.text, { message: 'Введите текст вопроса' });
    minLength(s.text, 3, { message: 'Минимум 3 символа' });
    required(s.title, { message: 'Введите название задачи' });
    minLength(s.title, 3, { message: 'Минимум 3 символа' });
    required(s.description, { message: 'Опишите задачу' });
    minLength(s.description, 10, { message: 'Минимум 10 символов' });
  });

  protected readonly _languages = LANGUAGES;
  protected readonly _weights: readonly QuestionWeight[] = [1, 2, 3];

  protected readonly _selectedCategory = computed<Category | null>(() => {
    const id = this._model().categoryId;
    if (id === NONE) return null;
    return this.categories().find((c) => c.id === id) ?? null;
  });

  protected readonly _weightHint = computed(() => {
    switch (this._model().weight) {
      case 3: return 'Высокий — критичный для роли';
      case 2: return 'Средний — стандартный вопрос';
      default: return 'Низкий — разогревочный';
    }
  });

  protected readonly _canSubmit = computed(() => {
    const v = this._model();
    if (v.kind === 'coding') {
      return v.title.trim().length >= 3 && v.description.trim().length >= 10;
    }
    return v.text.trim().length >= 3;
  });

  /** Lock the kind switch on existing questions — different kinds carry different data. */
  protected readonly _kindLocked = computed(() => this.mode() === 'edit');

  constructor() {
    // Signal-inputs aren't populated yet when the constructor body runs; reading
    // `initial()` here would return null. An explicitEffect re-syncs the model
    // as soon as the input lands (and again if the parent ever swaps drafts).
    explicitEffect([this.initial], ([draft]) => {
      this._model.set(fromDraft(draft));
    });
  }

  protected _setKind(kind: QuestionKind): void {
    if (this._kindLocked()) return;
    this._model.update((m) => ({ ...m, kind }));
  }

  protected _setCategory(id: CategoryId | null): void {
    this._model.update((m) => ({ ...m, categoryId: id ?? NONE }));
  }

  protected _setWeight(weight: QuestionWeight): void {
    this._model.update((m) => ({ ...m, weight }));
  }

  protected _setLanguage(language: CodeLanguage): void {
    this._model.update((m) => ({ ...m, language }));
  }

  protected _onCancel(): void {
    this.dismissed.emit();
  }

  protected _onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this._canSubmit()) return;
    this.saved.emit(this._toDraft());
  }

  private _toDraft(): QuestionDraft {
    const v = this._model();
    const base = {
      categoryId: v.categoryId === NONE ? null : (v.categoryId as CategoryId),
      weight: v.weight,
      criteria: v.criteria,
    };
    if (v.kind === 'coding') {
      return {
        ...base,
        kind: 'coding',
        title: v.title,
        description: v.description,
        language: v.language,
        starterCode: v.starterCode,
      };
    }
    return { ...base, kind: 'verbal', text: v.text };
  }
}

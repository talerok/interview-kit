import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormField, form, minLength, required, submit } from '@angular/forms/signals';
import { IconComponent } from '../../../../shared/ui/icon';
import { colorFromName } from '../../../../shared/utils';
import {
  CATEGORY_PRESETS,
  deriveTemplateCode,
} from '../../constants/template-presets.const';
import { CreateTemplateInput } from '../../interfaces/template';

type PresetKey = (typeof CATEGORY_PRESETS)[number]['key'];

interface FormModel {
  readonly name: string;
  readonly description: string;
  readonly categoryPreset: PresetKey;
}

const initialModel = (): FormModel => ({
  name: '',
  description: '',
  categoryPreset: 'tech',
});

@Component({
  selector: 'app-template-create-dialog',
  imports: [FormField, IconComponent],
  templateUrl: './template-create-dialog.component.html',
  styleUrl: './template-create-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateCreateDialogComponent {
  readonly open = input<boolean>(false);

  readonly dismissed = output<void>();
  readonly submitted = output<CreateTemplateInput>();

  protected readonly _dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly _model = signal<FormModel>(initialModel());

  protected readonly _form = form(this._model, (s) => {
    required(s.name, { message: 'Введите название' });
    minLength(s.name, 2, { message: 'Минимум 2 символа' });
  });

  protected readonly _presets = CATEGORY_PRESETS;

  protected readonly _previewCode = computed(() => deriveTemplateCode(this._model().name));
  protected readonly _previewName = computed(() => this._model().name.trim() || 'Без названия');
  protected readonly _previewColor = computed(() => colorFromName(this._model().name));

  private readonly _destroyRef = inject(DestroyRef);

  constructor() {
    toObservable(this.open)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((open) => this._syncDialog(open));
  }

  protected _onCancel(): void {
    const el = this._dialog().nativeElement;
    if (el.open) {
      el.close();
    }
  }

  protected _onNativeClose(): void {
    this.dismissed.emit();
  }

  protected _onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    void submit(this._form, async () => {
      this.submitted.emit({ ...this._model() });
    });
  }

  protected _setPreset(key: PresetKey): void {
    this._model.update((m) => ({ ...m, categoryPreset: key }));
  }

  protected _seedColor(label: string): string {
    return colorFromName(label);
  }

  private _syncDialog(open: boolean): void {
    const el = this._dialog().nativeElement;
    if (open === el.open) {
      return;
    }
    if (open) {
      this._resetModel();
      el.showModal();
      return;
    }
    el.close();
  }

  private _resetModel(): void {
    this._model.set(initialModel());
  }
}

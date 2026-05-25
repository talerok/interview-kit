import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon';
import { PluralRuPipe, FmtDatePipe } from '../../../../shared/pipes';
import { CategoryId, TemplateId } from '../../../templates/interfaces/template';
import { TemplatesActions } from '../../../templates/models/state/templates.actions';
import { TemplatesStore } from '../../../templates/models/state/templates.store';
import { NewInterviewActions } from './models/state/new-interview.actions';
import { NewInterviewStore } from './models/state/new-interview.store';

@Component({
  selector: 'app-new-interview',
  imports: [RouterLink, IconComponent, PluralRuPipe, FmtDatePipe],
  templateUrl: './new-interview.component.html',
  styleUrl: './new-interview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NewInterviewStore, NewInterviewActions],
})
export class NewInterviewComponent implements OnInit {
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  protected readonly _templates = inject(TemplatesStore);
  protected readonly _templatesActions = inject(TemplatesActions);
  protected readonly _store = inject(NewInterviewStore);
  protected readonly _actions = inject(NewInterviewActions);

  protected readonly _questionForms = ['вопрос', 'вопроса', 'вопросов'] as const;
  protected readonly _categoryForms = ['категория', 'категории', 'категорий'] as const;
  protected readonly _templateForms = ['шаблон', 'шаблона', 'шаблонов'] as const;

  protected readonly _countPresets = [5, 8, 10, 15] as const;
  private readonly _minutesPerQuestionEstimate = 4.5;

  protected readonly _selectedTemplate = computed(() => {
    const id = this._store.templateId();
    return id === null ? null : this._templates.value().find((t) => t.id === id) ?? null;
  });

  protected readonly _estimatedMin = computed(() =>
    Math.round(this._store.effectiveCount() * this._minutesPerQuestionEstimate),
  );

  ngOnInit(): void {
    if (this._templates.isEmpty()) {
      this._templatesActions
        .load()
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe(() => this._maybeSelectFirst());
      return;
    }
    this._maybeSelectFirst();
  }

  protected _selectTemplate(id: TemplateId): void {
    this._actions
      .selectTemplate(id)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  protected _decCount(): void {
    this._actions.setCount(this._store.count() - 1);
  }

  protected _incCount(): void {
    this._actions.setCount(this._store.count() + 1);
  }

  protected _setCount(value: number): void {
    this._actions.setCount(value);
  }

  protected _toggleCategory(id: CategoryId): void {
    this._actions.toggleCategory(id);
  }

  protected _toggleAllCategories(): void {
    this._actions.toggleAllCategories();
  }

  protected _isCategoryActive(id: CategoryId): boolean {
    return this._store.effectiveActiveCategoryIds().includes(id);
  }

  protected _onCandidateName(event: Event): void {
    this._actions.updateCandidate({ name: (event.target as HTMLInputElement).value });
  }

  protected _onCandidatePosition(event: Event): void {
    this._actions.updateCandidate({ position: (event.target as HTMLInputElement).value });
  }

  protected _onCandidateDate(event: Event): void {
    this._actions.updateCandidate({ date: (event.target as HTMLInputElement).value });
  }

  protected _onCancel(): void {
    void this._router.navigate(['/templates']);
  }

  protected _onStart(): void {
    this._actions
      .start()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((interview) => this._router.navigate(['/run', interview.id]));
  }

  private _maybeSelectFirst(): void {
    if (this._store.templateId() !== null) {
      return;
    }
    const first = this._templates.value()[0];
    if (first === undefined) {
      return;
    }
    this._selectTemplate(first.id);
  }
}

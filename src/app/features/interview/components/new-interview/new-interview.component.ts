import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon';
import { PluralRuPipe, FmtDatePipe } from '../../../../shared/pipes';
import { explicitEffect } from '../../../../shared/utils';
import { CategoryId, TemplateId } from '../../../templates/interfaces/template';
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
export class NewInterviewComponent {
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  protected readonly _templates = inject(TemplatesStore);
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

  constructor() {
    // Auto-pick the first template as soon as the list becomes non-empty.
    // The store's rxResource loads on first read; this effect waits for that.
    explicitEffect([this._templates.value], ([templates]) => {
      if (templates.length === 0) return;
      if (this._store.templateId() !== null) return;
      this._selectTemplate(templates[0].id);
    });
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
}

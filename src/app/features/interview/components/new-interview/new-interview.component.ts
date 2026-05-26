import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FmtDatePipe, PluralRuPipe } from '../../../../shared/pipes';
import { IconComponent } from '../../../../shared/ui/icon';
import { explicitEffect } from '../../../../shared/utils';
import { Category, CategoryId, TemplateId } from '../../../templates/interfaces/template';
import { TemplatesStore } from '../../../templates/models/state/templates.store';
import { NewInterviewActions } from './models/state/new-interview.actions';
import {
  CategoryPick,
  NewInterviewStore,
  PickMode,
  RunOrder,
} from './models/state/new-interview.store';

interface PickRow {
  readonly pick: CategoryPick;
  readonly category: Category;
  readonly available: number;
  readonly effective: number;
}

@Component({
  selector: 'app-new-interview',
  imports: [RouterLink, IconComponent, PluralRuPipe, FmtDatePipe, CdkDropList, CdkDrag],
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

  private readonly _minutesPerQuestionEstimate = 4.5;

  protected readonly _selectedTemplate = computed(() => {
    const id = this._store.templateId();
    if (id === null) return null;

    const value = this._templates.value().find((t) => t.id === id);
    return value ?? null;
  });

  protected readonly _estimatedMin = computed(() =>
    Math.round(this._store.effectiveTotal() * this._minutesPerQuestionEstimate),
  );

  /** Render-ready pick rows joined with their category + available counts. */
  protected readonly _rows = computed<readonly PickRow[]>(() => {
    const categoryById = new Map(this._store.categories().map((c) => [c.id, c]));
    return this._store
      .picks()
      .map((pick) => {
        const category = categoryById.get(pick.categoryId);
        if (category === undefined) return null;
        const available = this._store.availableInCategory(pick.categoryId);
        return {
          pick,
          category,
          available,
          effective: this._store.effectivePickCount(pick),
        };
      })
      .filter((row): row is PickRow => row !== null);
  });

  protected readonly _enabledRows = computed(() => this._rows().filter((r) => r.pick.enabled));
  protected readonly _enabledCount = computed(() => this._enabledRows().length);
  protected readonly _allEnabled = computed(() => {
    const rows = this._rows();
    return rows.length > 0 && rows.every((r) => r.pick.enabled);
  });

  constructor() {
    // Auto-pick the first template once they load
    explicitEffect([this._templates.value], ([templates]) => {
      if (templates.length === 0) return;
      if (this._store.templateId() !== null) return;
      this._selectTemplate(templates[0].id);
    });
  }

  protected _selectTemplate(id: TemplateId): void {
    this._actions.selectTemplate(id).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }

  protected _onToggleAll(): void {
    this._actions.toggleAllCategories();
  }

  protected _onToggle(categoryId: CategoryId, enabled: boolean): void {
    this._actions.setEnabled(categoryId, enabled);
  }

  protected _onCountChange(categoryId: CategoryId, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this._actions.setPickCount(categoryId, Math.round(value));
    }
  }

  protected _incCount(row: PickRow): void {
    if (row.pick.count >= row.available) return;
    this._actions.setPickCount(row.pick.categoryId, row.pick.count + 1);
  }

  protected _decCount(row: PickRow): void {
    if (row.pick.count <= 0) return;
    this._actions.setPickCount(row.pick.categoryId, row.pick.count - 1);
  }

  protected _setMode(categoryId: CategoryId, mode: PickMode): void {
    this._actions.setPickMode(categoryId, mode);
  }

  protected _setRunOrder(value: RunOrder): void {
    this._actions.setRunOrder(value);
  }

  protected _onDrop(event: CdkDragDrop<readonly PickRow[]>): void {
    this._actions.reorderPicks(event.previousIndex, event.currentIndex);
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

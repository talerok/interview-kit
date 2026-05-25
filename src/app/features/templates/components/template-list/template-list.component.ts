import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon';
import { TemplatesActions } from '../../models/state/templates.actions';
import { TemplatesStore } from '../../models/state/templates.store';
import { CreateTemplateInput, TemplateId } from '../../interfaces/template';
import { TemplateCardComponent } from './components/template-card/template-card.component';
import { TemplateCreateDialogComponent } from '../template-create-dialog/template-create-dialog.component';

@Component({
  selector: 'app-template-list',
  imports: [IconComponent, TemplateCardComponent, TemplateCreateDialogComponent],
  templateUrl: './template-list.component.html',
  styleUrl: './template-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateListComponent {
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  protected readonly _store = inject(TemplatesStore);
  protected readonly _actions = inject(TemplatesActions);

  protected readonly _dialogOpen = signal(false);

  protected _openTemplate(id: TemplateId): void {
    // TODO: route to editor when implemented
    void this._router.navigate(['/templates', id]);
  }

  protected _removeTemplate(id: TemplateId): void {
    if (!confirm('Удалить шаблон вместе с его вопросами и категориями?')) return;
    this._actions.delete(id).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }

  protected _openCreate(): void {
    this._dialogOpen.set(true);
  }

  protected _closeCreate(): void {
    this._dialogOpen.set(false);
  }

  protected _onCreate(input: CreateTemplateInput): void {
    this._actions
      .create(input)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._dialogOpen.set(false));
  }
}

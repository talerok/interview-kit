import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TemplateEditorActions } from '../../models/state/template-editor.actions';
import { TemplateEditorStore } from '../../models/state/template-editor.store';

@Component({
  selector: 'app-editor-meta',
  templateUrl: './editor-meta.component.html',
  styleUrl: './editor-meta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorMetaComponent {
  protected readonly _store = inject(TemplateEditorStore);
  private readonly _actions = inject(TemplateEditorActions);
  private readonly _destroyRef = inject(DestroyRef);

  protected _onNameBlur(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    const current = this._store.template();
    if (current === null || value.length < 2 || value === current.name) {
      return;
    }
    this._actions
      .updateMeta({ name: value })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  protected _onDescriptionBlur(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    const current = this._store.template();
    if (current === null || value === current.description) {
      return;
    }
    this._actions
      .updateMeta({ description: value })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }
}

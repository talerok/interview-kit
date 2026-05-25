import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon';
import { asId } from '../../../../shared/utils';
import { TemplateEditorActions } from './models/state/template-editor.actions';
import { TemplateEditorStore } from './models/state/template-editor.store';
import { EditorMetaComponent } from './components/editor-meta/editor-meta.component';
import { EditorSideComponent } from './components/editor-side/editor-side.component';
import { QuestionListComponent } from './components/question-list/question-list.component';

@Component({
  selector: 'app-template-editor',
  imports: [
    RouterLink,
    IconComponent,
    EditorMetaComponent,
    EditorSideComponent,
    QuestionListComponent,
  ],
  templateUrl: './template-editor.component.html',
  styleUrl: './template-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TemplateEditorStore, TemplateEditorActions],
})
export class TemplateEditorComponent implements OnInit {
  /** Bound from route param via withComponentInputBinding(). */
  readonly id = input.required<string>();

  protected readonly _store = inject(TemplateEditorStore);
  protected readonly _actions = inject(TemplateEditorActions);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _template = this._store.template;
  protected readonly _notFound = computed(
    () => this._store.isLoaded() && this._template() === null,
  );

  ngOnInit(): void {
    const templateId = asId<'TemplateId'>(this.id());
    this._actions
      .load(templateId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }
}

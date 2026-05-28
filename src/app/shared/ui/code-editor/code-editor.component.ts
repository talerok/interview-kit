import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
import { CodeLanguage } from '../../../features/templates/interfaces/template';
import { ThemeStore } from '../../theme';
import { explicitEffect } from '../../utils';
import { CHROME_THEME, EDITOR_SETUP, LANGUAGE_EXTENSIONS, SYNTAX_BY_THEME } from './constants';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrl: './code-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeEditorComponent implements OnDestroy {
  readonly value = model<string>('');
  readonly language = input<CodeLanguage>('plain');
  readonly readonly = input<boolean>(false);
  readonly placeholder = input<string>('');

  private readonly _theme = inject(ThemeStore);
  private readonly _host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly _languageCompartment = new Compartment();
  private readonly _readonlyCompartment = new Compartment();
  private readonly _placeholderCompartment = new Compartment();
  private readonly _syntaxCompartment = new Compartment();
  private _view: EditorView | null = null;
  /** Guards the value-effect from re-dispatching changes that originated locally. */
  private _suppressValueEffect = false;

  constructor() {
    afterNextRender(() => this._init());

    explicitEffect([this.value], ([next]) => {
      this._applyExternalValue(next);
    });
    explicitEffect([this.language], ([lang]) => {
      this._reconfigure(this._languageCompartment, LANGUAGE_EXTENSIONS[lang]);
    });
    explicitEffect([this.readonly], ([ro]) => {
      this._reconfigure(this._readonlyCompartment, EditorState.readOnly.of(ro));
    });
    explicitEffect([this.placeholder], ([p]) => {
      this._reconfigure(this._placeholderCompartment, p ? cmPlaceholder(p) : []);
    });
    explicitEffect([this._theme.value], ([t]) => {
      this._reconfigure(this._syntaxCompartment, SYNTAX_BY_THEME[t]);
    });
  }

  ngOnDestroy(): void {
    this._view?.destroy();
  }

  private _init(): void {
    const extensions: Extension[] = [
      this._languageCompartment.of(LANGUAGE_EXTENSIONS[this.language()]),
      this._readonlyCompartment.of(EditorState.readOnly.of(this.readonly())),
      this._placeholderCompartment.of(this.placeholder() ? cmPlaceholder(this.placeholder()) : []),
      this._syntaxCompartment.of(SYNTAX_BY_THEME[this._theme.value()]),
      CHROME_THEME,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const next = update.state.doc.toString();
        this._suppressValueEffect = true;
        this.value.set(next);
        this._suppressValueEffect = false;
      }),
    ];

    this._view = new EditorView({
      state: EditorState.create({
        doc: this.value(),
        extensions: [...EDITOR_SETUP, ...extensions],
      }),
      parent: this._host().nativeElement,
    });
  }

  private _applyExternalValue(next: string): void {
    if (this._view === null || this._suppressValueEffect) {
      return;
    }
    const current = this._view.state.doc.toString();
    if (next === current) {
      return;
    }

    this._view.dispatch({
      changes: { from: 0, to: this._view.state.doc.length, insert: next },
    });
  }

  private _reconfigure(compartment: Compartment, extension: Extension): void {
    if (this._view === null) {
      return;
    }

    this._view.dispatch({ effects: compartment.reconfigure(extension) });
  }
}

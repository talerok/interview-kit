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
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import {
  StreamLanguage,
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { go } from '@codemirror/legacy-modes/mode/go';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import {
  EditorView,
  placeholder as cmPlaceholder,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { CodeLanguage } from '../../../features/templates/interfaces/template';
import { Theme, ThemeStore } from '../../theme';
import { explicitEffect } from '../../utils';

/**
 * Custom basicSetup analogue — every feature CodeMirror ships in `basicSetup`
 * minus `autocompletion()` and `completionKeymap`. We do not want IDE-style
 * suggestion popups in this editor.
 */
const editorSetup: Extension[] = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  highlightActiveLine(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
    indentWithTab,
  ]),
];

const langExtension = (lang: CodeLanguage): Extension => {
  switch (lang) {
    case 'javascript':
      return javascript();
    case 'typescript':
      return javascript({ typescript: true });
    case 'python':
      return python();
    case 'sql':
      return sql();
    case 'java':
      return java();
    case 'go':
      return StreamLanguage.define(go);
    case 'plain':
    default:
      return [];
  }
};

/**
 * Chrome theme — fully driven by our CSS variables, so light↔dark switches
 * automatically via :root[data-theme=…]. The only theme-aware extension is
 * the syntax highlight style: defaultHighlightStyle ships in basicSetup and
 * is tuned for light; we layer oneDarkHighlightStyle on top when dark.
 */
const chromeTheme: Extension = EditorView.theme({
  '&': {
    fontSize: 'var(--text-sm)',
    color: 'var(--fg-strong)',
    backgroundColor: 'transparent',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
  },
  '.cm-content': {
    padding: '10px 0',
    caretColor: 'var(--fg-strong)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--fg-strong)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--fg-subtle)',
    border: 'none',
    borderInlineEnd: '1px solid var(--border-subtle)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--fg-muted)',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  // Only style CodeMirror's own selection overlay — `drawSelection` already
  // hides the native browser selection. CM's own baseTheme uses
  // `.cm-selectionLayer .cm-selectionBackground` plus a `&dark` variant with
  // higher specificity than our theme, so we mirror the selector and add
  // `!important` to win regardless of editor mode.
  '.cm-selectionLayer .cm-selectionBackground, &.cm-focused .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--bg-active) !important',
  },
  '.cm-placeholder': {
    color: 'var(--fg-faint)',
  },
});

const syntaxExtension = (theme: Theme): Extension =>
  theme === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : [];

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
      this._reconfigure(this._languageCompartment, langExtension(lang));
    });
    explicitEffect([this.readonly], ([ro]) => {
      this._reconfigure(this._readonlyCompartment, EditorState.readOnly.of(ro));
    });
    explicitEffect([this.placeholder], ([p]) => {
      this._reconfigure(this._placeholderCompartment, p ? cmPlaceholder(p) : []);
    });
    explicitEffect([this._theme.value], ([t]) => {
      this._reconfigure(this._syntaxCompartment, syntaxExtension(t));
    });
  }

  ngOnDestroy(): void {
    this._view?.destroy();
  }

  private _init(): void {
    const extensions: Extension[] = [
      this._languageCompartment.of(langExtension(this.language())),
      this._readonlyCompartment.of(EditorState.readOnly.of(this.readonly())),
      this._placeholderCompartment.of(this.placeholder() ? cmPlaceholder(this.placeholder()) : []),
      this._syntaxCompartment.of(syntaxExtension(this._theme.value())),
      chromeTheme,
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
        extensions: [...editorSetup, ...extensions],
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

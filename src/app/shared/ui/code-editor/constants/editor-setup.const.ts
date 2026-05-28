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
import { EditorState, Extension } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { CodeLanguage } from '../../../../features/templates/interfaces/template';

/**
 * Custom `basicSetup` analogue — every feature CodeMirror ships in `basicSetup`
 * minus `autocompletion()` and `completionKeymap`. We do not want IDE-style
 * suggestion popups in this editor.
 */
export const EDITOR_SETUP: Extension[] = [
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

/** TS forces the record to cover every member of `CodeLanguage`. */
export const LANGUAGE_EXTENSIONS: Record<CodeLanguage, Extension> = {
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  python: python(),
  sql: sql(),
  java: java(),
  go: StreamLanguage.define(go),
  plain: [],
};

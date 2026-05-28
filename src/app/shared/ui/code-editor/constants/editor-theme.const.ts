import { syntaxHighlighting } from '@codemirror/language';
import { Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { Theme } from '../../../theme';

/**
 * Chrome theme — fully driven by our CSS variables, so light↔dark switches
 * automatically via :root[data-theme=…]. The only theme-aware piece is the
 * syntax highlight style: `defaultHighlightStyle` (shipped in EDITOR_SETUP)
 * is tuned for light; we layer `oneDarkHighlightStyle` on top when dark.
 */
export const CHROME_THEME: Extension = EditorView.theme({
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

/** TS forces the record to cover every member of `Theme`. */
export const SYNTAX_BY_THEME: Record<Theme, Extension> = {
  light: [],
  dark: syntaxHighlighting(oneDarkHighlightStyle),
};

import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'interviewkit:theme';

const readInitialTheme = (): Theme => {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _theme = signal<Theme>(readInitialTheme());

  readonly value = this._theme.asReadonly();
  readonly value$ = toObservable(this._theme);

  constructor() {
    this._applyToDom(this._theme());
    this.value$.subscribe((theme) => this._applyToDom(theme));
  }

  set(theme: Theme): void {
    this._theme.set(theme);
  }

  toggle(): void {
    this._theme.set(this._theme() === 'dark' ? 'light' : 'dark');
  }

  private _applyToDom(theme: Theme): void {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset['theme'] = theme;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }
}

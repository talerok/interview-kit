import { WritableSignal } from '@angular/core';
import { Draft, create } from 'mutative';

type MutationFn<T> = (draft: Draft<T>) => void;

/**
 * `signal.update(create(...))` shortcut for nested-immutable updates via
 * mutative. Accepts both non-nullable and nullable signals; when the current
 * value is null the signal is left untouched.
 *
 * Two overloads are kept because TS signal types are invariant —
 * `WritableSignal<T>` does not match `WritableSignal<T | null>` and vice
 * versa, so a single signature can't cover both call shapes.
 */
export function mutateSignal<T extends object>(
  signal: WritableSignal<T>,
  mutation: MutationFn<T>,
): void;
export function mutateSignal<T extends object>(
  signal: WritableSignal<T | null>,
  mutation: MutationFn<T>,
): void;
export function mutateSignal<T extends object>(
  signal: WritableSignal<T> | WritableSignal<T | null>,
  mutation: MutationFn<T>,
): void {
  (signal as WritableSignal<T | null>).update((value) =>
    value === null ? null : create(value, mutation),
  );
}

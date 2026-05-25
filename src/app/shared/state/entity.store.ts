import { Signal, WritableSignal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export abstract class EntityStore<T extends object> {
  protected readonly _value: WritableSignal<T | null> = signal<T | null>(null);

  readonly value: Signal<T | null> = this._value.asReadonly();
  readonly value$: Observable<T | null> = toObservable(this._value);

  set(value: T | null): void {
    this._value.set(value);
  }

  patch(patch: Partial<T>): void {
    const current = this._value();
    this._value.set(current ? { ...current, ...patch } : ({ ...patch } as T));
  }

  clear(): void {
    this._value.set(null);
  }
}

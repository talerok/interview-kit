import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export abstract class ListEntityStore<T> {
  protected readonly _value: WritableSignal<readonly T[]> = signal<readonly T[]>([]);

  readonly value: Signal<readonly T[]> = this._value.asReadonly();
  readonly value$: Observable<readonly T[]> = toObservable(this._value);
  readonly count: Signal<number> = computed(() => this._value().length);
  readonly isEmpty: Signal<boolean> = computed(() => this.count() === 0);

  set(items: readonly T[]): void {
    this._value.set(items);
  }

  add(item: T): void {
    this._value.update((items) => [...items, item]);
  }

  removeBy(predicate: (item: T) => boolean): void {
    this._value.update((items) => items.filter((item) => !predicate(item)));
  }

  updateBy(predicate: (item: T) => boolean, patch: (item: T) => T): void {
    this._value.update((items) => items.map((item) => (predicate(item) ? patch(item) : item)));
  }

  upsert(item: T, key: (item: T) => unknown): void {
    const k = key(item);
    const exists = this._value().some((x) => key(x) === k);
    if (exists) {
      this.updateBy((x) => key(x) === k, () => item);
    } else {
      this.add(item);
    }
  }

  clear(): void {
    this._value.set([]);
  }
}

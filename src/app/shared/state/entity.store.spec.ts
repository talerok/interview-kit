import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { EntityStore } from './entity.store';

interface User {
  readonly name: string;
  readonly age: number;
}

class UserStore extends EntityStore<User> {}

describe('EntityStore', () => {
  it('starts as null', () => {
    TestBed.runInInjectionContext(() => {
      const store = new UserStore();
      expect(store.value()).toBeNull();
    });
  });

  it('set() replaces the value', () => {
    TestBed.runInInjectionContext(() => {
      const store = new UserStore();
      store.set({ name: 'Анна', age: 30 });
      expect(store.value()).toEqual({ name: 'Анна', age: 30 });
    });
  });

  it('patch() merges into an existing value', () => {
    TestBed.runInInjectionContext(() => {
      const store = new UserStore();
      store.set({ name: 'Анна', age: 30 });
      store.patch({ age: 31 });
      expect(store.value()).toEqual({ name: 'Анна', age: 31 });
    });
  });

  it('patch() on a null value treats the patch as the full value', () => {
    TestBed.runInInjectionContext(() => {
      const store = new UserStore();
      store.patch({ name: 'Иван' });
      // intentional: patch on null falls back to the partial as the new state
      expect(store.value()).toEqual({ name: 'Иван' });
    });
  });

  it('clear() resets to null', () => {
    TestBed.runInInjectionContext(() => {
      const store = new UserStore();
      store.set({ name: 'Анна', age: 30 });
      store.clear();
      expect(store.value()).toBeNull();
    });
  });

  it('value$ emits the current value to subscribers', async () => {
    const value = await TestBed.runInInjectionContext(() => {
      const store = new UserStore();
      store.set({ name: 'Анна', age: 30 });
      return firstValueFrom(store.value$);
    });
    expect(value).toEqual({ name: 'Анна', age: 30 });
  });
});

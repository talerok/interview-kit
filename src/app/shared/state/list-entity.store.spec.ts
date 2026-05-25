import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ListEntityStore } from './list-entity.store';

interface Item {
  readonly id: string;
  readonly label: string;
}

class ItemStore extends ListEntityStore<Item> {}

describe('ListEntityStore', () => {
  it('starts empty', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ItemStore();
      expect(store.value()).toEqual([]);
      expect(store.count()).toBe(0);
      expect(store.isEmpty()).toBe(true);
    });
  });

  it('set() replaces the list and updates count/isEmpty', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ItemStore();
      store.set([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]);
      expect(store.count()).toBe(2);
      expect(store.isEmpty()).toBe(false);
    });
  });

  it('add() appends to the list', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ItemStore();
      store.set([{ id: 'a', label: 'A' }]);
      store.add({ id: 'b', label: 'B' });
      expect(store.value()).toEqual([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]);
    });
  });

  it('removeBy() drops matching items', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ItemStore();
      store.set([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]);
      store.removeBy((x) => x.id === 'a');
      expect(store.value()).toEqual([{ id: 'b', label: 'B' }]);
    });
  });

  it('updateBy() patches only matching items', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ItemStore();
      store.set([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]);
      store.updateBy(
        (x) => x.id === 'a',
        (x) => ({ ...x, label: 'AA' }),
      );
      expect(store.value()).toEqual([
        { id: 'a', label: 'AA' },
        { id: 'b', label: 'B' },
      ]);
    });
  });

  it('upsert() inserts when missing', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ItemStore();
      store.set([{ id: 'a', label: 'A' }]);
      store.upsert({ id: 'b', label: 'B' }, (x) => x.id);
      expect(store.value()).toEqual([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]);
    });
  });

  it('upsert() replaces when present', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ItemStore();
      store.set([{ id: 'a', label: 'A' }]);
      store.upsert({ id: 'a', label: 'A-new' }, (x) => x.id);
      expect(store.value()).toEqual([{ id: 'a', label: 'A-new' }]);
    });
  });

  it('clear() resets to empty', () => {
    TestBed.runInInjectionContext(() => {
      const store = new ItemStore();
      store.set([{ id: 'a', label: 'A' }]);
      store.clear();
      expect(store.value()).toEqual([]);
      expect(store.isEmpty()).toBe(true);
    });
  });
});

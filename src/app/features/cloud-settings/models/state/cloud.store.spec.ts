import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CloudStore } from './cloud.store';

describe('CloudStore', () => {
  it('starts with fileVersion 0 and null lastSync', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    expect(store.fileVersion()).toBe(0);
    expect(store.lastSync()).toBeNull();
  });

  it('setFileVersion stores the cloud-wide manifest version', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.setFileVersion(5);
    expect(store.fileVersion()).toBe(5);
    store.setFileVersion(7);
    expect(store.fileVersion()).toBe(7);
  });

  it('setFileVersion is idempotent when value is unchanged', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.setFileVersion(5);
    store.setFileVersion(5);
    expect(store.fileVersion()).toBe(5);
  });

  it('resetFileVersion drops to zero (used on account switch)', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.setFileVersion(9);
    store.resetFileVersion();
    expect(store.fileVersion()).toBe(0);
  });

  it('setLastSync stores the timestamp', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.setLastSync('2026-05-25T10:00:00.000Z');
    expect(store.lastSync()).toBe('2026-05-25T10:00:00.000Z');
  });
});

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { initialCloud } from '../../interfaces/cloud';
import { CloudStore } from './cloud.store';

describe('CloudStore', () => {
  it('hydrates with the initial cloud state on construction', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    expect(store.state()).toEqual(initialCloud());
    expect(store.active()).toBeNull();
    expect(store.fileVersion()).toBe(0);
    expect(store.isConnected()).toBe(false);
    expect(store.activeProvider()).toBeNull();
  });

  it('setActive() updates active provider key', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.setActive('dropbox');
    expect(store.active()).toBe('dropbox');
    expect(store.activeProvider()?.kind).toBe('dropbox');
  });

  it('setProvider() patches a provider without touching others', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.setProvider('dropbox', {
      connected: true,
      email: 'me@example.com',
      accessToken: 'tk',
    });
    const provider = store.state().providers.dropbox;
    expect(provider.connected).toBe(true);
    expect(provider.email).toBe('me@example.com');
    expect(provider.accessToken).toBe('tk');
    // unchanged
    expect(provider.path).toBe('/Apps/InterviewKit');
  });

  it('isConnected reflects activeProvider.connected', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.setProvider('dropbox', { connected: true });
    store.setActive('dropbox');
    expect(store.isConnected()).toBe(true);

    store.setActive(null);
    expect(store.isConnected()).toBe(false);
  });

  it('setFileVersion stores the cloud-wide manifest version', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    expect(store.fileVersion()).toBe(0);
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

  it('providers() exposes a stable single-element list', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    const out = store.providers();
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('dropbox');
  });

  it('hydrate() replaces the entire state', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    const next = {
      active: 'dropbox' as const,
      fileVersion: 42,
      providers: {
        dropbox: {
          kind: 'dropbox' as const,
          connected: true,
          email: 'a@b.com',
          path: '/Custom',
          lastSync: '2026-05-25T10:00:00.000Z',
          accessToken: 'tk',
          refreshToken: 'rt',
          tokenExpiresAt: '2026-05-26T10:00:00.000Z',
        },
      },
    };
    store.hydrate(next);
    expect(store.state()).toEqual(next);
    expect(store.isConnected()).toBe(true);
  });
});

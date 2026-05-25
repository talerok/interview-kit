import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Account, LOCAL_ACCOUNT_ID } from '../../../../core/account';
import { CloudStore } from './cloud.store';

const dropboxAccount = (email: string, overrides: Partial<Account> = {}): Account => ({
  id: `dropbox:${email}`,
  kind: 'dropbox',
  label: email,
  email,
  accessToken: 'tok',
  refreshToken: 'rt',
  tokenExpiresAt: null,
  ...overrides,
});

describe('CloudStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('hydrates from localStorage (defaults to a single local account when empty)', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    expect(store.accounts()).toHaveLength(1);
    expect(store.activeId()).toBe(LOCAL_ACCOUNT_ID);
    expect(store.isConnected()).toBe(false);
    expect(store.activeAccount()?.kind).toBe('local');
  });

  it('upsertAccount adds a new account and persists', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.upsertAccount(dropboxAccount('a@b.com'));
    expect(store.accounts()).toHaveLength(2);
    expect(store.cloudAccounts()).toHaveLength(1);

    const raw = localStorage.getItem('interviewkit:registry');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).accounts).toHaveLength(2);
  });

  it('upsertAccount replaces an existing account with the same id', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.upsertAccount(dropboxAccount('a@b.com', { accessToken: 'old' }));
    store.upsertAccount(dropboxAccount('a@b.com', { accessToken: 'new' }));
    expect(store.accounts()).toHaveLength(2);
    expect(store.cloudAccounts()[0].accessToken).toBe('new');
  });

  it('setActiveId switches the active workspace', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.upsertAccount(dropboxAccount('a@b.com'));
    store.setActiveId('dropbox:a@b.com');
    expect(store.activeId()).toBe('dropbox:a@b.com');
    expect(store.isConnected()).toBe(true);
  });

  it('removeAccount drops a cloud account and falls back to local when it was active', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.upsertAccount(dropboxAccount('a@b.com'));
    store.setActiveId('dropbox:a@b.com');
    store.removeAccount('dropbox:a@b.com');
    expect(store.cloudAccounts()).toHaveLength(0);
    expect(store.activeId()).toBe(LOCAL_ACCOUNT_ID);
  });

  it('removeAccount refuses to drop the local account', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.removeAccount(LOCAL_ACCOUNT_ID);
    expect(store.accounts()).toHaveLength(1);
  });

  it('isConnected is false for the local-only workspace', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
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

  it('resetFileVersion drops to zero (used on account switch)', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CloudStore);
    store.setFileVersion(9);
    store.resetFileVersion();
    expect(store.fileVersion()).toBe(0);
  });
});

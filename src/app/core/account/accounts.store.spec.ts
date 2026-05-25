import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Account, LOCAL_ACCOUNT_ID } from './account';
import { AccountsStore } from './accounts.store';

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

describe('AccountsStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('hydrates from localStorage (defaults to a single local account when empty)', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(AccountsStore);
    expect(store.accounts()).toHaveLength(1);
    expect(store.activeId()).toBe(LOCAL_ACCOUNT_ID);
    expect(store.isConnected()).toBe(false);
    expect(store.activeAccount()?.kind).toBe('local');
  });

  it('upsert adds a new account and persists to localStorage', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(AccountsStore);
    store.upsert(dropboxAccount('a@b.com'));
    expect(store.accounts()).toHaveLength(2);
    expect(store.cloudAccounts()).toHaveLength(1);

    const raw = localStorage.getItem('interviewkit:registry');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).accounts).toHaveLength(2);
  });

  it('upsert replaces an existing account with the same id', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(AccountsStore);
    store.upsert(dropboxAccount('a@b.com', { accessToken: 'old' }));
    store.upsert(dropboxAccount('a@b.com', { accessToken: 'new' }));
    expect(store.accounts()).toHaveLength(2);
    expect(store.cloudAccounts()[0].accessToken).toBe('new');
  });

  it('setActive switches the active workspace', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(AccountsStore);
    store.upsert(dropboxAccount('a@b.com'));
    store.setActive('dropbox:a@b.com');
    expect(store.activeId()).toBe('dropbox:a@b.com');
    expect(store.isConnected()).toBe(true);
  });

  it('remove drops a cloud account and falls back to local when it was active', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(AccountsStore);
    store.upsert(dropboxAccount('a@b.com'));
    store.setActive('dropbox:a@b.com');
    store.remove('dropbox:a@b.com');
    expect(store.cloudAccounts()).toHaveLength(0);
    expect(store.activeId()).toBe(LOCAL_ACCOUNT_ID);
  });

  it('remove refuses to drop the local account', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(AccountsStore);
    store.remove(LOCAL_ACCOUNT_ID);
    expect(store.accounts()).toHaveLength(1);
  });

  it('isConnected is false for the local-only workspace', () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(AccountsStore);
    expect(store.isConnected()).toBe(false);
  });
});

import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { mutateSignal } from '../../shared/utils';
import {
  Account,
  AccountId,
  AccountsRegistry,
  LOCAL_ACCOUNT_ID,
  isCloudAccount,
} from './account';
import { AccountsRepo } from './accounts-repo';

/**
 * Owns the accounts registry: the list of known accounts (local + every
 * connected cloud account) and which one is currently active.
 *
 * Identity-only. Cloud sync runtime state (manifest version, lastSync) and
 * cloud-specific actions (OAuth) live elsewhere.
 *
 * Hydrates from localStorage in the constructor and persists to localStorage
 * after every mutation.
 */
@Injectable({ providedIn: 'root' })
export class AccountsStore {
  private readonly _repo = inject(AccountsRepo);
  private readonly _registry = signal<AccountsRegistry>(this._repo.read());

  readonly registry: Signal<AccountsRegistry> = this._registry.asReadonly();
  readonly accounts: Signal<readonly Account[]> = computed(() => this._registry().accounts);
  readonly activeId: Signal<AccountId> = computed(() => this._registry().activeId);

  readonly activeAccount: Signal<Account | null> = computed(() => {
    const id = this.activeId();
    return this.accounts().find((a) => a.id === id) ?? null;
  });

  /** Cloud accounts only (the local workspace is excluded). */
  readonly cloudAccounts: Signal<readonly Account[]> = computed(() =>
    this.accounts().filter(isCloudAccount),
  );

  /** True when the active account is a cloud account with valid credentials. */
  readonly isConnected: Signal<boolean> = computed(() => {
    const a = this.activeAccount();
    return a !== null && isCloudAccount(a) && a.accessToken !== null;
  });

  upsert(account: Account): void {
    mutateSignal(this._registry, (draft) => {
      const idx = draft.accounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) draft.accounts[idx] = account;
      else draft.accounts.push(account);
    });
    this._repo.write(this._registry());
  }

  remove(id: AccountId): void {
    if (id === LOCAL_ACCOUNT_ID) return;
    mutateSignal(this._registry, (draft) => {
      draft.accounts = draft.accounts.filter((a) => a.id !== id);
      if (draft.activeId === id) draft.activeId = LOCAL_ACCOUNT_ID;
    });
    this._repo.write(this._registry());
  }

  setActive(id: AccountId): void {
    if (this._registry().activeId === id) return;
    mutateSignal(this._registry, (draft) => {
      draft.activeId = id;
    });
    this._repo.write(this._registry());
  }
}

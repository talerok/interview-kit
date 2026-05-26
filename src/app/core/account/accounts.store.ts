import { Injectable, Signal, computed, inject, signal } from '@angular/core';
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
 * Hydrates from localStorage in the constructor and auto-persists on every
 * mutation, so consumers can mutate without thinking about persistence.
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
    this._commit((r) => {
      const idx = r.accounts.findIndex((a) => a.id === account.id);
      const accounts =
        idx >= 0
          ? r.accounts.map((a, i) => (i === idx ? account : a))
          : [...r.accounts, account];
      return { ...r, accounts };
    });
  }

  remove(id: AccountId): void {
    if (id === LOCAL_ACCOUNT_ID) return;
    this._commit((r) => ({
      ...r,
      accounts: r.accounts.filter((a) => a.id !== id),
      activeId: r.activeId === id ? LOCAL_ACCOUNT_ID : r.activeId,
    }));
  }

  setActive(id: AccountId): void {
    if (this._registry().activeId === id) return;
    this._commit((r) => ({ ...r, activeId: id }));
  }

  private _commit(mutate: (r: AccountsRegistry) => AccountsRegistry): void {
    const next = mutate(this._registry());
    this._registry.set(next);
    this._repo.write(next);
  }
}

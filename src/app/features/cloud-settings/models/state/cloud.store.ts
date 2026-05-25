import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import {
  Account,
  AccountId,
  AccountsRegistry,
  AccountsRepo,
  LOCAL_ACCOUNT_ID,
} from '../../../../core/account';

/**
 * Holds the accounts registry (list + active) in memory. Source of truth is
 * localStorage; CloudActions hydrates this store on construction and writes
 * back via AccountsRepo on every mutation.
 */
@Injectable({ providedIn: 'root' })
export class CloudStore {
  private readonly _accountsRepo = inject(AccountsRepo);
  private readonly _registry = signal<AccountsRegistry>(this._accountsRepo.read());
  private readonly _fileVersion = signal(0);
  private readonly _lastSync = signal<string | null>(null);

  readonly registry: Signal<AccountsRegistry> = this._registry.asReadonly();
  readonly accounts: Signal<readonly Account[]> = computed(() => this._registry().accounts);
  readonly activeId: Signal<AccountId> = computed(() => this._registry().activeId);

  readonly activeAccount: Signal<Account | null> = computed(() => {
    const id = this.activeId();
    return this.accounts().find((a) => a.id === id) ?? null;
  });

  readonly isConnected: Signal<boolean> = computed(() => {
    const a = this.activeAccount();
    return a !== null && a.kind !== 'local' && a.accessToken !== null;
  });

  /** Cloud accounts only (excludes the always-present local workspace). */
  readonly cloudAccounts: Signal<readonly Account[]> = computed(() =>
    this.accounts().filter((a) => a.kind !== 'local'),
  );

  /** Cloud-wide manifest version. Reset on account switch, set from manifest on sync. */
  readonly fileVersion: Signal<number> = this._fileVersion.asReadonly();
  readonly lastSync: Signal<string | null> = this._lastSync.asReadonly();

  upsertAccount(account: Account): void {
    this._commit((r) => {
      const idx = r.accounts.findIndex((a) => a.id === account.id);
      const accounts =
        idx >= 0
          ? r.accounts.map((a, i) => (i === idx ? account : a))
          : [...r.accounts, account];
      return { ...r, accounts };
    });
  }

  removeAccount(id: AccountId): void {
    if (id === LOCAL_ACCOUNT_ID) return;
    this._commit((r) => ({
      ...r,
      accounts: r.accounts.filter((a) => a.id !== id),
      activeId: r.activeId === id ? LOCAL_ACCOUNT_ID : r.activeId,
    }));
  }

  setActiveId(id: AccountId): void {
    if (this._registry().activeId === id) return;
    this._commit((r) => ({ ...r, activeId: id }));
  }

  /** Apply a mutation and write the resulting registry to localStorage. */
  private _commit(mutate: (r: AccountsRegistry) => AccountsRegistry): void {
    const next = mutate(this._registry());
    this._registry.set(next);
    this._accountsRepo.write(next);
  }

  setFileVersion(version: number): void {
    if (this._fileVersion() === version) return;
    this._fileVersion.set(version);
  }

  resetFileVersion(): void {
    this._fileVersion.set(0);
  }

  setLastSync(value: string | null): void {
    this._lastSync.set(value);
  }
}

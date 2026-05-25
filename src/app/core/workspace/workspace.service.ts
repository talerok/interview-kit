import { Injectable, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, switchMap, tap } from 'rxjs';
import { CloudSyncService } from '../../api/cloud';
import { AppDb } from '../../api/storage';
import { AccountsStore, dbNameFor } from '../account';

/**
 * Owns the runtime workspace lifecycle:
 *
 * - reacts to {@link AccountsStore.activeId} changes by swapping the IDB
 *   connection to that account's database;
 * - exposes a `dataToken` signal that consumers (feature stores, the shell)
 *   watch to know when their caches must reload — bumps on DB swap and
 *   whenever the sync engine writes new data into the current DB.
 *
 * Knows nothing about specific features. Feature code self-subscribes to
 * `dataToken` to refresh its in-memory state — cloud-settings no longer
 * dispatches reloads by name.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly _accounts = inject(AccountsStore);
  private readonly _appDb = inject(AppDb);
  private readonly _sync = inject(CloudSyncService);

  private readonly _dataToken = signal(0);
  readonly dataToken: Signal<number> = this._dataToken.asReadonly();

  constructor() {
    // React to active-account changes: swap workspace DB, bump token,
    // then ask the sync engine to sync (no-op if account is local).
    // Root-singleton subscription lives for the app's lifetime; bound to
    // DestroyRef so unit tests can tear it down cleanly.
    toObservable(this._accounts.activeId)
      .pipe(
        distinctUntilChanged(),
        switchMap((id) =>
          this._appDb.open(dbNameFor(id)).pipe(
            tap(() => this._bumpToken()),
            switchMap(() => this._sync.syncNow()),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  /**
   * Tell subscribers that the current DB content changed under their feet
   * (e.g. cloud sync just pulled new aggregates). Use sparingly — feature
   * stores will re-read from IDB.
   */
  notifyExternalWrite(): void {
    this._bumpToken();
  }

  private _bumpToken(): void {
    this._dataToken.update((v) => v + 1);
  }
}

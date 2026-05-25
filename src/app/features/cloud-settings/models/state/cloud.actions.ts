import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, defer, forkJoin, map, of, switchMap } from 'rxjs';
import {
  CLOUD_PROVIDERS,
  CloudAccount,
  CloudProvider,
  CloudSyncService,
} from '../../../../api/cloud';
import { AppDb } from '../../../../api/storage';
import {
  Account,
  AccountId,
  AccountKind,
  LOCAL_ACCOUNT_ID,
  accountIdFor,
  dbNameFor,
} from '../../../../core/account';
import { InterviewsActions } from '../../../interview/models/state/interviews.actions';
import { TemplatesActions } from '../../../templates/models/state/templates.actions';
import { CloudStore } from './cloud.store';

@Injectable({ providedIn: 'root' })
export class CloudActions {
  private readonly _store = inject(CloudStore);
  private readonly _appDb = inject(AppDb);
  private readonly _providers = inject(CLOUD_PROVIDERS);
  private readonly _sync = inject(CloudSyncService);
  private readonly _templatesActions = inject(TemplatesActions);
  private readonly _interviewsActions = inject(InterviewsActions);

  private readonly _dialogOpen = signal(false);
  readonly isDialogOpen = this._dialogOpen.asReadonly();

  constructor() {
    // CloudStore hydrates itself from localStorage on construction, so the
    // active account is already readable here.
    this._sync.setDelegate({
      activeProvider: () => {
        const a = this._store.activeAccount();
        if (a === null || a.kind === 'local' || a.accessToken === null) return null;
        return this._providerOf(a.kind);
      },
      onSyncCompleted: () => {
        this._store.setLastSync(new Date().toISOString());
        return of(undefined);
      },
      onDataPulled: () =>
        forkJoin([this._templatesActions.load(), this._interviewsActions.load()]).pipe(
          map(() => undefined),
        ),
      onVersionSynced: (version) => {
        this._store.setFileVersion(version);
      },
    });
  }

  /**
   * Hydrate and run a full sync for the currently-active account. Called
   * from AppShell on bootstrap; the registry is already loaded in ctor.
   */
  load(): Observable<void> {
    return of(undefined);
  }

  openDialog(): void {
    this._dialogOpen.set(true);
  }

  closeDialog(): void {
    this._dialogOpen.set(false);
  }

  /**
   * Begin authorization for a cloud provider. Mock providers emit
   * immediately; real OAuth navigates away and the flow continues in
   * `finalizeOAuth` after the callback route loads.
   */
  connect(kind: Exclude<AccountKind, 'local'>): Observable<void> {
    const provider = this._providerOf(kind);
    if (provider === null) return EMPTY;
    return provider.beginAuthorize().pipe(
      switchMap((account) => this._adoptAccount(provider, account)),
    );
  }

  /** OAuth callback: exchange code for tokens, then add/activate the account. */
  finalizeOAuth(kind: Exclude<AccountKind, 'local'>, params: URLSearchParams): Observable<void> {
    const provider = this._providerOf(kind);
    if (provider === null) return EMPTY;
    return provider.completeAuthorize(params).pipe(
      switchMap((account) => this._adoptAccount(provider, account)),
    );
  }

  /**
   * Switch the active workspace to a different account. Closes the current
   * IDB connection, opens the new one, reloads feature stores from disk,
   * and (for cloud accounts) runs a full sync.
   */
  activate(id: AccountId): Observable<void> {
    if (this._store.activeId() === id) return of(undefined);
    this._store.setActiveId(id);
    return this._swapWorkspace(id);
  }

  /**
   * Disconnect a cloud account: drop tokens and remove from the registry.
   * The account's IDB is left intact so reconnecting later resurfaces the
   * same data. If the disconnected account was active, fall back to local.
   */
  disconnect(id: AccountId): Observable<void> {
    if (id === LOCAL_ACCOUNT_ID) return of(undefined);
    const wasActive = this._store.activeId() === id;
    this._store.removeAccount(id);
    if (wasActive) {
      return this._swapWorkspace(LOCAL_ACCOUNT_ID);
    }
    return of(undefined);
  }

  syncNow(): Observable<void> {
    if (!this._store.isConnected()) return of(undefined);
    return this._sync.syncNow();
  }

  private _adoptAccount(provider: CloudProvider, account: CloudAccount): Observable<void> {
    const id = accountIdFor(provider.kind, account.email);
    const next: Account = {
      id,
      kind: provider.kind,
      label: account.email,
      email: account.email,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiresAt: account.expiresAt,
    };
    const wasAlreadyActive = this._store.activeId() === id;
    this._store.upsertAccount(next);

    if (wasAlreadyActive) {
      // Same account — just refresh tokens in the same workspace and sync.
      return this._sync.syncNow();
    }
    // New (or different) account — swap workspaces.
    this._store.setActiveId(id);
    return this._swapWorkspace(id);
  }

  private _swapWorkspace(id: AccountId): Observable<void> {
    return defer(async () => {
      // Reset cross-account state before the swap so stale signals don't
      // briefly bleed through to the new workspace.
      this._store.resetFileVersion();
      this._store.setLastSync(null);
    }).pipe(
      switchMap(() => this._appDb.open(dbNameFor(id))),
      switchMap(() =>
        forkJoin([this._templatesActions.load(), this._interviewsActions.load()]),
      ),
      switchMap(() => (this._store.isConnected() ? this._sync.syncNow() : of(undefined))),
      map(() => undefined),
      catchError((err) => {
        console.error('[cloud-actions] workspace swap failed:', err);
        return of(undefined);
      }),
    );
  }


  private _providerOf(kind: AccountKind): CloudProvider | null {
    return this._providers.find((p) => p.kind === kind) ?? null;
  }
}


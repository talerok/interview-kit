import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, of, switchMap } from 'rxjs';
import {
  CLOUD_PROVIDERS,
  CloudAccount,
  CloudProvider,
  CloudSyncService,
} from '../../../../api/cloud';
import {
  Account,
  AccountId,
  AccountKind,
  AccountsStore,
  CloudAccountKind,
  LOCAL_ACCOUNT_ID,
  accountIdFor,
  isCloudAccount,
} from '../../../../core/account';
import { WorkspaceService } from '../../../../core/workspace';
import { CloudStore } from './cloud.store';

/**
 * OAuth + cloud-sync facade. Identity mutations (upsert, setActive, remove)
 * go directly to AccountsStore; WorkspaceService picks them up and swaps
 * the workspace DB. CloudActions itself never reaches into other features.
 */
@Injectable({ providedIn: 'root' })
export class CloudActions {
  private readonly _store = inject(CloudStore);
  private readonly _accounts = inject(AccountsStore);
  private readonly _workspace = inject(WorkspaceService);
  private readonly _providers = inject(CLOUD_PROVIDERS);
  private readonly _sync = inject(CloudSyncService);
  private readonly _router = inject(Router);

  private readonly _defaultRoute = ['/templates'];

  constructor() {
    this._sync.setDelegate({
      activeProvider: () => {
        const a = this._accounts.activeAccount();
        if (a === null || !isCloudAccount(a) || a.accessToken === null) return null;
        return this._providerOf(a.kind);
      },
      onSyncCompleted: () => {
        this._store.setLastSync(new Date().toISOString());
        return of(undefined);
      },
      onDataPulled: () => {
        this._workspace.notifyExternalWrite();
        return of(undefined);
      },
      onVersionSynced: (version) => {
        this._store.setFileVersion(version);
      },
    });
  }

  /**
   * Begin authorization for a cloud provider. Mock providers emit
   * immediately; real OAuth navigates away and the flow continues in
   * `finalizeOAuth` after the callback route loads.
   */
  connect(kind: CloudAccountKind): Observable<void> {
    const provider = this._providerOf(kind);
    if (provider === null) return EMPTY;
    return provider.beginAuthorize().pipe(
      switchMap((account) => this._adoptAccount(provider, account)),
    );
  }

  /** OAuth callback: exchange code for tokens, then upsert + activate. */
  finalizeOAuth(kind: CloudAccountKind, params: URLSearchParams): Observable<void> {
    const provider = this._providerOf(kind);
    if (provider === null) return EMPTY;
    return provider.completeAuthorize(params).pipe(
      switchMap((account) => this._adoptAccount(provider, account)),
    );
  }

  /**
   * Switch the active workspace. WorkspaceService observes activeId and
   * does the heavy lifting (swap DB, reload, sync). The user gets sent
   * to the default route — staying on, say, an editor for a template
   * that may not exist in the new workspace would be confusing.
   */
  activate(id: AccountId): void {
    if (this._accounts.activeId() === id) return;
    this._accounts.setActive(id);
    void this._router.navigate(this._defaultRoute);
  }

  /**
   * Disconnect a cloud account: drop tokens and remove from the registry.
   * The account's IDB is left intact so reconnecting later resurfaces the
   * same data. If the disconnected account was active, AccountsStore falls
   * back to the local workspace, which WorkspaceService then picks up.
   */
  disconnect(id: AccountId): void {
    if (id === LOCAL_ACCOUNT_ID) return;
    const wasActive = this._accounts.activeId() === id;
    this._accounts.remove(id);
    if (wasActive) {
      void this._router.navigate(this._defaultRoute);
    }
  }

  syncNow(): Observable<void> {
    if (!this._accounts.isConnected()) return of(undefined);
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
    const wasAlreadyActive = this._accounts.activeId() === id;
    this._accounts.upsert(next);

    if (wasAlreadyActive) {
      // Same account — tokens were just refreshed in-place. Trigger a sync.
      return this._sync.syncNow();
    }
    // Setting active fires WorkspaceService's swap → open new DB → syncNow.
    this._accounts.setActive(id);
    void this._router.navigate(this._defaultRoute);
    return of(undefined);
  }

  private _providerOf(kind: AccountKind): CloudProvider | null {
    return this._providers.find((p) => p.kind === kind) ?? null;
  }
}

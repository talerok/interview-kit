import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  CLOUD_PROVIDERS,
  CloudAccount,
  CloudProvider,
  CloudSyncService,
} from '../../../../api/cloud';
import { InterviewsActions } from '../../../interview/models/state/interviews.actions';
import { TemplatesActions } from '../../../templates/models/state/templates.actions';
import { CloudProviderKind } from '../../interfaces/cloud';
import { CloudMetaRepo } from '../data/cloud-meta.repo';
import { CloudStore } from './cloud.store';

@Injectable({ providedIn: 'root' })
export class CloudActions {
  private readonly _store = inject(CloudStore);
  private readonly _repo = inject(CloudMetaRepo);
  private readonly _providers = inject(CLOUD_PROVIDERS);
  private readonly _sync = inject(CloudSyncService);
  private readonly _templatesActions = inject(TemplatesActions);
  private readonly _interviewsActions = inject(InterviewsActions);

  private readonly _dialogOpen = signal(false);
  readonly isDialogOpen = this._dialogOpen.asReadonly();

  constructor() {
    this._sync.setDelegate({
      activeProvider: () => {
        const kind = this._store.active();
        return kind === null ? null : this._providerOf(kind);
      },
      onSyncCompleted: (provider) => {
        this._store.setProvider(provider.kind, { lastSync: new Date().toISOString() });
        this._store.bumpFileVersion();
        return this._repo.save(this._store.state());
      },
      onDataPulled: () =>
        forkJoin([this._templatesActions.load(), this._interviewsActions.load()]).pipe(
          map(() => undefined),
        ),
    });
  }

  load(): Observable<void> {
    return this._repo.load().pipe(
      tap((state) => this._store.hydrate(state)),
      map(() => undefined),
    );
  }

  openDialog(): void {
    this._dialogOpen.set(true);
  }

  closeDialog(): void {
    this._dialogOpen.set(false);
  }

  /**
   * Begin authorization. Mock providers emit immediately; real OAuth providers
   * navigate the page away and the flow continues in `finalizeOAuth` after
   * the callback route loads.
   */
  connect(kind: CloudProviderKind): Observable<void> {
    const provider = this._providerOf(kind);
    if (provider === null) {
      return EMPTY;
    }
    return provider.beginAuthorize().pipe(
      switchMap((account) => this._applyAccount(provider, account)),
    );
  }

  /** Called by OAuthCallbackComponent. Exchanges the code for tokens and persists. */
  finalizeOAuth(kind: CloudProviderKind, params: URLSearchParams): Observable<void> {
    const provider = this._providerOf(kind);
    if (provider === null) {
      return EMPTY;
    }
    return provider.completeAuthorize(params).pipe(
      switchMap((account) => this._applyAccount(provider, account)),
    );
  }

  disconnect(kind: CloudProviderKind): Observable<void> {
    const provider = this._providerOf(kind);
    if (provider === null) {
      return EMPTY;
    }
    return provider.disconnect().pipe(
      catchError(() => of(undefined)),
      switchMap(() => {
        this._store.setProvider(kind, {
          connected: false,
          email: null,
          lastSync: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
        });
        if (this._store.active() === kind) {
          const fallback = this._store
            .providers()
            .find((p) => p.kind !== kind && p.connected);
          this._store.setActive(fallback?.kind ?? null);
        }
        return this._persist();
      }),
    );
  }

  activate(kind: CloudProviderKind): Observable<void> {
    this._store.setActive(kind);
    return this._persist();
  }

  syncNow(): Observable<void> {
    if (this._store.active() === null) {
      return of(undefined);
    }
    return this._sync.syncNow();
  }

  private _applyAccount(provider: CloudProvider, account: CloudAccount): Observable<void> {
    const now = new Date().toISOString();
    this._store.setProvider(provider.kind, {
      connected: true,
      email: account.email,
      lastSync: now,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiresAt: account.expiresAt,
    });
    if (this._store.active() === null) {
      this._store.setActive(provider.kind);
    }
    // Persist token first so a subsequent reload won't lose it, then run a full
    // sync (pull → merge → push). Pulling on connect is what makes a fresh device
    // pick up data from the same Dropbox account.
    return this._persist().pipe(switchMap(() => this._sync.syncNow()));
  }

  private _persist(): Observable<void> {
    return this._repo.save(this._store.state());
  }

  private _providerOf(kind: CloudProviderKind): CloudProvider | null {
    return this._providers.find((p) => p.kind === kind) ?? null;
  }
}

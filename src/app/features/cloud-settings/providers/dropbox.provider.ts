import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, from, lastValueFrom, map } from 'rxjs';
import {
  AggregateKind,
  CloudAccount,
  CloudAggregateDto,
  CloudProvider,
  ManifestDto,
} from '../../../api/cloud';
import {
  computeCodeChallenge,
  generateCodeVerifier,
  generateState,
} from '../../../shared/utils';
import { environment } from '../../../../environments/environment';
import { CloudStore } from '../models/state/cloud.store';

const AUTHORIZE_URL = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_URL = 'https://api.dropbox.com/oauth2/token';
const ACCOUNT_URL = 'https://api.dropboxapi.com/2/users/get_current_account';
const FILES_BASE = 'https://content.dropboxapi.com/2';
const RPC_BASE = 'https://api.dropboxapi.com/2';

const SESSION_VERIFIER_KEY = 'cloud:dropbox:pkce-verifier';
const SESSION_STATE_KEY = 'cloud:dropbox:pkce-state';

interface TokenResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
  readonly account_id?: string;
}

interface AccountResponse {
  readonly email: string;
}

const aggregatePath = (kind: AggregateKind, id: string): string =>
  kind === 'template' ? `/templates/${id}.json` : `/interviews/${id}.json`;

@Injectable({ providedIn: 'root' })
export class DropboxProvider implements CloudProvider {
  private readonly _http = inject(HttpClient);
  private readonly _cloudStore = inject(CloudStore);

  readonly kind = 'dropbox' as const;
  readonly label = 'Dropbox';
  readonly defaultPath = '/Apps/InterviewKit';

  beginAuthorize(): Observable<CloudAccount> {
    return defer(async () => {
      const verifier = generateCodeVerifier();
      const challenge = await computeCodeChallenge(verifier);
      const state = generateState();
      sessionStorage.setItem(SESSION_VERIFIER_KEY, verifier);
      sessionStorage.setItem(SESSION_STATE_KEY, state);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: environment.cloud.dropbox.clientId,
        redirect_uri: environment.cloud.dropbox.redirectUri,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        token_access_type: 'offline',
      });
      location.href = `${AUTHORIZE_URL}?${params.toString()}`;
      // Page is navigating away — make this observable never emit a value.
      return new Promise<CloudAccount>(() => {});
    });
  }

  completeAuthorize(params: URLSearchParams): Observable<CloudAccount> {
    return defer(async () => {
      const error = params.get('error');
      if (error !== null) {
        throw new Error(params.get('error_description') ?? error);
      }
      const code = params.get('code');
      const state = params.get('state');
      const expectedState = sessionStorage.getItem(SESSION_STATE_KEY);
      const verifier = sessionStorage.getItem(SESSION_VERIFIER_KEY);
      sessionStorage.removeItem(SESSION_STATE_KEY);
      sessionStorage.removeItem(SESSION_VERIFIER_KEY);
      if (code === null || verifier === null || state !== expectedState) {
        throw new Error('Не удалось проверить OAuth-ответ Dropbox.');
      }

      const tokenBody = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: environment.cloud.dropbox.clientId,
        redirect_uri: environment.cloud.dropbox.redirectUri,
        code_verifier: verifier,
      });
      const tokens = await lastValueFrom(
        this._http.post<TokenResponse>(TOKEN_URL, tokenBody.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const account = await lastValueFrom(
        this._http.post<AccountResponse>(ACCOUNT_URL, null, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }),
      );

      return {
        kind: this.kind,
        email: account.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      };
    });
  }

  disconnect(): Observable<void> {
    const token = this._token();
    if (token === null) {
      return defer(async () => undefined);
    }
    return this._http
      .post(`${RPC_BASE}/auth/token/revoke`, null, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(map(() => undefined));
  }

  fetchManifest(): Observable<ManifestDto | null> {
    return from(this._download<ManifestDto>('/manifest.json'));
  }

  pushManifest(manifest: ManifestDto): Observable<void> {
    return from(this._upload('/manifest.json', manifest));
  }

  fetchAggregate(kind: AggregateKind, id: string): Observable<CloudAggregateDto | null> {
    return from(this._download<CloudAggregateDto>(aggregatePath(kind, id)));
  }

  pushAggregate(kind: AggregateKind, id: string, body: CloudAggregateDto): Observable<void> {
    return from(this._upload(aggregatePath(kind, id), body));
  }

  deleteAggregate(kind: AggregateKind, id: string): Observable<void> {
    return defer(async () => {
      const token = await this._validToken();
      await lastValueFrom(
        this._http.post(
          `${RPC_BASE}/files/delete_v2`,
          { path: aggregatePath(kind, id) },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return undefined;
    });
  }

  private async _download<T>(path: string): Promise<T | null> {
    const token = await this._validToken();
    try {
      const blob = await lastValueFrom(
        this._http.post(`${FILES_BASE}/files/download`, null, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ path }),
          },
          responseType: 'blob',
        }),
      );
      const text = await blob.text();
      return JSON.parse(text) as T;
    } catch (error) {
      if (this._isNotFound(error)) return null;
      throw error;
    }
  }

  private async _upload<T>(path: string, body: T): Promise<void> {
    const token = await this._validToken();
    await lastValueFrom(
      this._http.post(`${FILES_BASE}/files/upload`, JSON.stringify(body), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path,
            mode: 'overwrite',
            mute: true,
            autorename: false,
          }),
        },
      }),
    );
  }

  private async _validToken(): Promise<string> {
    const account = this._cloudStore.activeAccount();
    if (account === null || account.kind !== 'dropbox' || account.accessToken === null) {
      throw new Error('Dropbox не подключён.');
    }
    const stillFresh =
      account.tokenExpiresAt === null ||
      Date.parse(account.tokenExpiresAt) - Date.now() > 60_000;
    if (stillFresh) {
      return account.accessToken;
    }
    if (account.refreshToken === null) {
      throw new Error('Срок действия токена истёк, повторите подключение.');
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refreshToken,
      client_id: environment.cloud.dropbox.clientId,
    });
    const refreshed = await lastValueFrom(
      this._http.post<TokenResponse>(TOKEN_URL, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    this._cloudStore.upsertAccount({
      ...account,
      accessToken: refreshed.access_token,
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      refreshToken: refreshed.refresh_token ?? account.refreshToken,
    });
    return refreshed.access_token;
  }

  private _token(): string | null {
    return this._cloudStore.activeAccount()?.accessToken ?? null;
  }

  private _isNotFound(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const status = (error as { status?: number }).status;
    return status === 409;
  }
}

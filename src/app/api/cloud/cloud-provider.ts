import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AggregateKind, ManifestDto } from './dto';
import { CloudAggregateDto } from './dto';

export type CloudProviderKind = 'dropbox';

export interface CloudAccount {
  readonly kind: CloudProviderKind;
  readonly email: string;
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresAt: string | null;
}

export interface CloudProvider {
  readonly kind: CloudProviderKind;
  readonly label: string;
  readonly defaultPath: string;

  /**
   * Mock providers emit a CloudAccount synchronously.
   * Real OAuth providers navigate the page away and never emit — the flow continues in
   * `completeAuthorize` after the OAuth callback route loads.
   */
  beginAuthorize(): Observable<CloudAccount>;

  /** Real OAuth providers exchange the authorization code for tokens here. */
  completeAuthorize(params: URLSearchParams): Observable<CloudAccount>;

  disconnect(): Observable<void>;

  fetchManifest(): Observable<ManifestDto | null>;
  pushManifest(manifest: ManifestDto): Observable<void>;

  fetchAggregate(kind: AggregateKind, id: string): Observable<CloudAggregateDto | null>;
  pushAggregate(kind: AggregateKind, id: string, body: CloudAggregateDto): Observable<void>;
  deleteAggregate(kind: AggregateKind, id: string): Observable<void>;
}

export const CLOUD_PROVIDERS = new InjectionToken<readonly CloudProvider[]>('CLOUD_PROVIDERS');

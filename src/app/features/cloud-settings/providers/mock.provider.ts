import { EMPTY, Observable, of } from 'rxjs';
import {
  AggregateKind,
  CloudAccount,
  CloudAggregateDto,
  CloudProvider,
  CloudProviderKind,
  ManifestDto,
} from '../../../api/cloud';

/**
 * In-memory stub for a cloud provider — used until real OAuth + API integration lands.
 * Authorize succeeds instantly and surfaces a fake e-mail, snapshots are no-ops.
 */
export const createMockProvider = (
  kind: CloudProviderKind,
  label: string,
  defaultPath: string,
): CloudProvider => ({
  kind,
  label,
  defaultPath,

  beginAuthorize(): Observable<CloudAccount> {
    return of({
      kind,
      email: 'me@local',
      accessToken: 'mock-token',
      refreshToken: null,
      expiresAt: null,
    });
  },

  completeAuthorize(): Observable<CloudAccount> {
    return EMPTY;
  },

  disconnect(): Observable<void> {
    return of(undefined);
  },

  fetchManifest(): Observable<ManifestDto | null> {
    return of(null);
  },

  pushManifest(): Observable<void> {
    return of(undefined);
  },

  fetchAggregate(_kind: AggregateKind, _id: string): Observable<CloudAggregateDto | null> {
    return of(null);
  },

  pushAggregate(): Observable<void> {
    return of(undefined);
  },

  deleteAggregate(): Observable<void> {
    return of(undefined);
  },
});

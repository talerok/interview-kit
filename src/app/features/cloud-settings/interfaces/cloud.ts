import { CloudProviderKind } from '../../../api/cloud';

export type { CloudProviderKind } from '../../../api/cloud';

export interface CloudProviderState {
  readonly kind: CloudProviderKind;
  readonly connected: boolean;
  readonly email: string | null;
  readonly path: string;
  readonly lastSync: string | null;
  readonly accessToken: string | null;
  readonly refreshToken: string | null;
  readonly tokenExpiresAt: string | null;
}

export interface CloudState {
  readonly active: CloudProviderKind | null;
  readonly fileVersion: number;
  readonly providers: Readonly<Record<CloudProviderKind, CloudProviderState>>;
}

export const initialCloud = (): CloudState => ({
  active: null,
  fileVersion: 0,
  providers: {
    dropbox: {
      kind: 'dropbox',
      connected: false,
      email: null,
      path: '/Apps/InterviewKit',
      lastSync: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
    },
  },
});

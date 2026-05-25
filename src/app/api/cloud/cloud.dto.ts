import { CloudProviderKind } from './cloud-provider';

export interface CloudStateDto {
  readonly active: CloudProviderKind | null;
  readonly providers: Record<CloudProviderKind, CloudProviderStateDto>;
  readonly fileVersion: number;
}

export interface CloudProviderStateDto {
  readonly connected: boolean;
  readonly email: string | null;
  readonly path: string;
  readonly lastSync: string | null;
}

export const initialCloudState = (): CloudStateDto => ({
  active: null,
  fileVersion: 0,
  providers: {
    dropbox: {
      connected: false,
      email: null,
      path: '/Apps/InterviewKit',
      lastSync: null,
    },
  },
});

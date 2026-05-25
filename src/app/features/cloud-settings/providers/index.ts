import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { CLOUD_PROVIDERS, CloudProvider } from '../../../api/cloud';
import { DropboxProvider } from './dropbox.provider';

export { DropboxProvider };

export const provideCloudProviders = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    DropboxProvider,
    {
      provide: CLOUD_PROVIDERS,
      useFactory: (dropbox: DropboxProvider): readonly CloudProvider[] => [dropbox],
      deps: [DropboxProvider],
    },
  ]);

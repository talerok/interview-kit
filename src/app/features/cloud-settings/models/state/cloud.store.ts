import { Injectable, Signal, computed } from '@angular/core';
import { EntityStore } from '../../../../shared/state';
import {
  CloudProviderKind,
  CloudProviderState,
  CloudState,
  initialCloud,
} from '../../interfaces/cloud';

@Injectable({ providedIn: 'root' })
export class CloudStore extends EntityStore<CloudState> {
  constructor() {
    super();
    this.set(initialCloud());
  }

  readonly state: Signal<CloudState> = computed(() => this.value() ?? initialCloud());

  readonly active: Signal<CloudProviderKind | null> = computed(() => this.state().active);
  readonly fileVersion: Signal<number> = computed(() => this.state().fileVersion);

  readonly activeProvider: Signal<CloudProviderState | null> = computed(() => {
    const active = this.active();
    if (active === null) return null;
    return this.state().providers[active];
  });

  readonly isConnected: Signal<boolean> = computed(() => this.activeProvider()?.connected ?? false);

  readonly providers: Signal<readonly CloudProviderState[]> = computed(() => {
    const map = this.state().providers;
    return [map.dropbox];
  });

  hydrate(state: CloudState): void {
    this.set(state);
  }

  setProvider(kind: CloudProviderKind, patch: Partial<CloudProviderState>): void {
    const current = this.state();
    this.set({
      ...current,
      providers: {
        ...current.providers,
        [kind]: { ...current.providers[kind], ...patch },
      },
    });
  }

  setActive(kind: CloudProviderKind | null): void {
    this.patch({ active: kind });
  }

  setFileVersion(version: number): void {
    if (this.state().fileVersion === version) return;
    this.patch({ fileVersion: version });
  }
}

import { Injectable, Signal, signal } from '@angular/core';

/**
 * Holds cloud sync runtime state — values that come from a sync round and
 * are useful to show in the UI (manifest version, last sync timestamp).
 * Identity (which accounts exist, which is active) lives in AccountsStore.
 */
@Injectable({ providedIn: 'root' })
export class CloudStore {
  private readonly _fileVersion = signal(0);
  private readonly _lastSync = signal<string | null>(null);

  readonly fileVersion: Signal<number> = this._fileVersion.asReadonly();
  readonly lastSync: Signal<string | null> = this._lastSync.asReadonly();

  setFileVersion(version: number): void {
    if (this._fileVersion() === version) return;
    this._fileVersion.set(version);
  }

  resetFileVersion(): void {
    this._fileVersion.set(0);
  }

  setLastSync(value: string | null): void {
    this._lastSync.set(value);
  }
}

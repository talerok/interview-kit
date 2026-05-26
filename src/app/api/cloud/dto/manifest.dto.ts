export type AggregateKind = 'template' | 'interview';

export interface ManifestEntryDto {
  readonly kind: AggregateKind;
  readonly id: string;
  readonly rev: number;
  readonly updatedAt: string;
  readonly deleted?: boolean;
}

export interface ManifestDto {
  readonly schemaVersion: number;
  /**
   * Monotonic counter incremented on every successful push. Each device that
   * pulls this manifest stores `version` locally so the "vN" indicator in the
   * UI is consistent across all devices synced to the same account. Optional
   * for backward compatibility with manifests written by older builds.
   */
  readonly version?: number;
  readonly updatedAt: string;
  readonly entries: readonly ManifestEntryDto[];
}

export const MANIFEST_SCHEMA_VERSION = 1;

export const emptyManifest = (): ManifestDto => ({
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  version: 0,
  updatedAt: new Date().toISOString(),
  entries: [],
});

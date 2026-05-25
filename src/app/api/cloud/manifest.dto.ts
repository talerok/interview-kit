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
  readonly updatedAt: string;
  readonly entries: readonly ManifestEntryDto[];
}

export const MANIFEST_SCHEMA_VERSION = 1;

export const emptyManifest = (): ManifestDto => ({
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  entries: [],
});

// A tombstone marks an aggregate (template or interview) as deleted.
// Tombstones are pushed to the cloud manifest with `deleted: true` so other
// devices can replicate the deletion on their next pull.

export interface TombstoneDto {
  readonly key: string; // `${kind}:${id}` — IDB key
  readonly kind: 'template' | 'interview';
  readonly id: string;
  readonly rev: number; // one greater than the deleted entity's last rev
  readonly deletedAt: string;
}

export const tombstoneKey = (kind: 'template' | 'interview', id: string): string =>
  `${kind}:${id}`;

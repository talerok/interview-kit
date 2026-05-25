import { MigrationFn } from 'idxdb-utils';
import { STORES } from '../schema';
import { TombstoneDto } from '../dto';

export const v2Migration: MigrationFn = ({ db }) => {
  db.createObjectStore<TombstoneDto>(STORES.tombstones, { keyPath: 'key' });
};

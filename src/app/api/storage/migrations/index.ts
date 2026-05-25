import { MigrationFn, migrator } from 'idxdb-utils';
import { v1Migration } from './v1';
import { v2Migration } from './v2';

export const appMigrations: MigrationFn = migrator([
  { forVersion: 1, migration: v1Migration },
  { forVersion: 2, migration: v2Migration },
]);

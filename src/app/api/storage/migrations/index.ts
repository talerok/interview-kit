import { MigrationFn, migrator } from 'idxdb-utils';
import { v1Migration } from './v1';

export const appMigrations: MigrationFn = migrator([{ forVersion: 1, migration: v1Migration }]);

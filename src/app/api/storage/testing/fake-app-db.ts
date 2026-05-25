// Test helper: builds a fresh AppDb backed by fake-indexeddb.
//
// The IDB global is patched once per file via `vi.stubGlobal` so each spec
// file gets its own clean database. Call `createFakeAppDb()` inside the test
// (typically in beforeEach) to get an initialized AppDb pointed at a unique
// database name — that isolates tests from each other within the same file.

import { firstValueFrom } from 'rxjs';
import 'fake-indexeddb/auto';
import { AppDb } from '../app-db';
import { DB_NAME, DB_VERSION } from '../schema';
import { appMigrations } from '../migrations';
import { open } from 'idxdb-utils';

let _counter = 0;

export const createFakeAppDb = async (): Promise<AppDb> => {
  const db = new AppDb();
  const name = `${DB_NAME}_test_${++_counter}_${Math.random().toString(36).slice(2)}`;
  const handle = await open({ name, version: DB_VERSION, migration: appMigrations });
  // Inject the opened database directly to bypass the singleton-name behavior
  // of AppDb.init() (which would reuse the production DB_NAME).
  (db as unknown as { _db: typeof handle })._db = handle;
  return db;
};

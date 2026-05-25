import { Injectable } from '@angular/core';
import { Database, open } from 'idxdb-utils';
import { Observable, defer, map } from 'rxjs';
import { DB_NAME, DB_VERSION } from './schema';
import { appMigrations } from './migrations';

@Injectable({ providedIn: 'root' })
export class AppDb {
  private _db: Database | null = null;

  init(): Observable<void> {
    return defer(async () => {
      if (this._db) return;
      this._db = await open({ name: DB_NAME, version: DB_VERSION, migration: appMigrations });
    }).pipe(map(() => undefined));
  }

  get database(): Database {
    if (!this._db) {
      throw new Error('AppDb is not initialized. Did app-init run?');
    }
    return this._db;
  }
}

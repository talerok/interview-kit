import { Injectable, Signal, signal } from '@angular/core';
import { Database, open } from 'idxdb-utils';
import { Observable, defer, map } from 'rxjs';
import { appMigrations } from './migrations';
import { DB_VERSION } from './schema';

/**
 * Holds the currently-active IDB connection. Each account (local + every
 * connected cloud account) owns its own database; switching account closes
 * the current connection and opens the new one in-place.
 */
@Injectable({ providedIn: 'root' })
export class AppDb {
  private _db: Database | null = null;
  private readonly _currentName = signal<string | null>(null);

  /** Reactive: the DB name currently active, or null before init. */
  readonly currentName: Signal<string | null> = this._currentName.asReadonly();

  /** Opens (or re-opens) the DB by name. Idempotent if already on this name. */
  open(name: string): Observable<void> {
    return defer(async () => {
      if (this._db && this._currentName() === name) {
        return;
      }
      if (this._db) {
        this._db.raw.close();
        this._db = null;
      }
      this._db = await open({ name, version: DB_VERSION, migration: appMigrations });
      this._currentName.set(name);
    }).pipe(map(() => undefined));
  }

  get database(): Database {
    if (!this._db) {
      throw new Error('AppDb is not initialized. Did app-init run?');
    }
    return this._db;
  }
}

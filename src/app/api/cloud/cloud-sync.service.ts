import { Injectable, Signal, inject, signal } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  defer,
  firstValueFrom,
  of,
  switchMap,
} from 'rxjs';
import { AppDb, tombstoneKey } from '../storage';
import { CloudProvider } from './cloud-provider';
import {
  AGGREGATE_SCHEMA_VERSION,
  InterviewAggregateDto,
  TemplateAggregateDto,
} from './dto';
import {
  AggregateKind,
  MANIFEST_SCHEMA_VERSION,
  ManifestDto,
  ManifestEntryDto,
} from './dto';
import {
  LocalRevs,
  Snapshot,
  deleteInterviewLocally,
  deleteTemplateLocally,
  readLocalRevs,
  readSnapshot,
  writeInterviewAggregate,
  writeTemplateAggregate,
} from './workspace-io';

const PUSH_DEBOUNCE_MS = 3000;

interface DirtyKey {
  readonly kind: AggregateKind;
  readonly id: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface CloudSyncDelegate {
  /** Active provider, or null when no cloud is connected (push is a no-op then). */
  readonly activeProvider: () => CloudProvider | null;
  /**
   * Called when a sync round completes successfully (push or full sync).
   * Returns an Observable so the sync flow can await persist without leaking a
   * `.subscribe()` inside Actions.
   */
  readonly onSyncCompleted: (provider: CloudProvider) => Observable<void>;
  /**
   * Called after pull writes new aggregates into IDB so feature stores can
   * reload from disk. Optional — when omitted, callers must refresh manually.
   */
  readonly onDataPulled?: () => Observable<void>;
  /**
   * Called when a fresh cloud manifest version is observed (after pull) or
   * written (after push). Lets the UI surface a counter that's identical
   * across all devices synced to the same account.
   */
  readonly onVersionSynced?: (version: number) => void;
}

@Injectable({ providedIn: 'root' })
export class CloudSyncService {
  private readonly _appDb = inject(AppDb);

  private readonly _trigger$ = new Subject<void>();
  private readonly _status = signal<SyncStatus>('idle');
  private readonly _lastError = signal<string | null>(null);
  private _delegate: CloudSyncDelegate | null = null;

  readonly status: Signal<SyncStatus> = this._status.asReadonly();
  readonly lastError: Signal<string | null> = this._lastError.asReadonly();

  constructor() {
    // Debounced push only — local writes don't need a pull on every keystroke.
    this._trigger$
      .pipe(
        debounceTime(PUSH_DEBOUNCE_MS),
        switchMap(() => this._runPushOnly()),
      )
      .subscribe();
  }

  /** CloudActions injects itself here so the sync service can resolve the active provider. */
  setDelegate(delegate: CloudSyncDelegate): void {
    this._delegate = delegate;
  }

  markDirty(_key: DirtyKey): void {
    this._trigger$.next();
  }

  markDeleted(_key: DirtyKey): void {
    this._trigger$.next();
  }

  /** Full sync: pull cloud → merge by rev → push local back. Used for connect and "Sync now". */
  syncNow(): Observable<void> {
    return this._runFullSync();
  }

  /** @deprecated Use {@link syncNow}. Retained as alias. */
  pushNow(): Observable<void> {
    return this._runFullSync();
  }

  private _runFullSync(): Observable<void> {
    return defer(async () => {
      const provider = this._delegate?.activeProvider() ?? null;
      if (provider === null) return;

      this._status.set('syncing');
      this._lastError.set(null);
      // Reuse the manifest pulled here for the push-side no-op check so we
      // don't fetch it twice.
      const pulled = await this._pullInner(provider);
      await this._pushInner(provider, pulled);
      this._status.set('idle');
    }).pipe(this._errorPipe('sync'));
  }

  private _runPushOnly(): Observable<void> {
    return defer(async () => {
      const provider = this._delegate?.activeProvider() ?? null;
      if (provider === null) return;

      this._status.set('syncing');
      this._lastError.set(null);
      // markDirty-triggered path — caller already mutated local state, so a
      // version bump is justified. Skip the extra fetchManifest round-trip.
      await this._pushInner(provider, null);
      this._status.set('idle');
    }).pipe(this._errorPipe('push'));
  }

  // ───────── pull ─────────

  private async _pullInner(provider: CloudProvider): Promise<ManifestDto | null> {
    const manifest = await firstValue(provider.fetchManifest());
    if (manifest === null) return null;

    this._delegate?.onVersionSynced?.(manifest.version ?? 0);

    const localRevs = await readLocalRevs(this._appDb);
    let didWrite = false;

    for (const entry of manifest.entries) {
      const localRev = this._localRevFor(localRevs, entry.kind, entry.id);

      // Skip if local is already at-or-ahead of cloud — local mutation wins.
      if (localRev !== undefined && entry.rev <= localRev) continue;

      if (entry.deleted === true) {
        // Cloud says deleted, and our local rev (active or tombstone) is older.
        // Cascade-delete locally and record the tombstone so the deletion keeps
        // propagating from this device to others.
        if (entry.kind === 'template') {
          await deleteTemplateLocally(this._appDb, entry.id, entry.rev, entry.updatedAt);
        } else {
          await deleteInterviewLocally(this._appDb, entry.id, entry.rev, entry.updatedAt);
        }
        didWrite = true;
        continue;
      }

      const agg = await firstValue(provider.fetchAggregate(entry.kind, entry.id));
      if (agg === null) continue;
      if (entry.kind === 'template') {
        await writeTemplateAggregate(this._appDb, agg as TemplateAggregateDto);
      } else {
        await writeInterviewAggregate(this._appDb, agg as InterviewAggregateDto);
      }
      didWrite = true;
    }

    if (!didWrite) return manifest;

    const pulled = this._delegate?.onDataPulled?.();
    if (pulled) {
      await firstValue(pulled);
    }

    return manifest;
  }

  private _localRevFor(
    revs: LocalRevs,
    kind: 'template' | 'interview',
    id: string,
  ): number | undefined {
    const active = kind === 'template' ? revs.templates.get(id) : revs.interviews.get(id);
    const tomb = revs.tombstones.get(tombstoneKey(kind, id));
    if (active === undefined && tomb === undefined) return undefined;
    return Math.max(active ?? 0, tomb ?? 0);
  }


  // ───────── push ─────────

  private async _pushInner(
    provider: CloudProvider,
    knownManifest: ManifestDto | null,
  ): Promise<void> {
    // For the full-sync path we already fetched the manifest during pull —
    // reuse it to avoid a second round-trip. Push-only (debounced markDirty)
    // skips the fetch entirely; we know there are local mutations.
    const current = knownManifest;
    const snapshot = await readSnapshot(this._appDb);
    const plannedEntries = this._buildEntries(snapshot);

    if (current !== null && entriesEqual(plannedEntries, current.entries)) {
      // Cloud already matches local — skip all uploads and the manifest
      // write. Version stays where it is so we don't churn it on idle syncs.
      this._delegate?.onVersionSynced?.(current.version ?? 0);
      const completed = this._delegate?.onSyncCompleted(provider);
      if (completed) await firstValue(completed);
      return;
    }

    const nextVersion = (current?.version ?? 0) + 1;

    for (const template of snapshot.templates) {
      const agg: TemplateAggregateDto = {
        schemaVersion: AGGREGATE_SCHEMA_VERSION,
        template,
        categories: snapshot.categoriesByTemplate.get(template.id) ?? [],
        questions: snapshot.questionsByTemplate.get(template.id) ?? [],
      };
      await firstValue(provider.pushAggregate('template', template.id, agg));
    }

    for (const interview of snapshot.interviews) {
      const agg: InterviewAggregateDto = {
        schemaVersion: AGGREGATE_SCHEMA_VERSION,
        interview,
        answers: snapshot.answersByInterview.get(interview.id) ?? [],
      };
      await firstValue(provider.pushAggregate('interview', interview.id, agg));
    }

    // Tombstones: drop the cloud file (idempotent — already-deleted is fine)
    // and include the entry in the manifest as `deleted: true` so other
    // devices replicate the deletion on their next pull.
    for (const tomb of snapshot.tombstones) {
      try {
        await firstValue(provider.deleteAggregate(tomb.kind, tomb.id));
      } catch (e) {
        // Treat "not found" as success; the file may already be gone from a
        // previous push round or another device.
        console.warn('[cloud-sync] deleteAggregate failed (ignored):', tomb.key, e);
      }
    }

    const manifest: ManifestDto = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      entries: plannedEntries,
    };
    await firstValue(provider.pushManifest(manifest));
    this._delegate?.onVersionSynced?.(nextVersion);

    const completed = this._delegate?.onSyncCompleted(provider);
    if (completed) {
      await firstValue(completed);
    }
  }

  /** Manifest-entry list our snapshot would publish — used both for the
   *  no-op short-circuit and for the final manifest write. */
  private _buildEntries(snapshot: Snapshot): readonly ManifestEntryDto[] {
    const out: ManifestEntryDto[] = [];
    for (const t of snapshot.templates) {
      out.push({ kind: 'template', id: t.id, rev: t.rev, updatedAt: t.updatedAt });
    }
    for (const i of snapshot.interviews) {
      out.push({ kind: 'interview', id: i.id, rev: i.rev, updatedAt: i.updatedAt });
    }
    for (const tomb of snapshot.tombstones) {
      out.push({
        kind: tomb.kind,
        id: tomb.id,
        rev: tomb.rev,
        updatedAt: tomb.deletedAt,
        deleted: true,
      });
    }
    return out;
  }

  private _errorPipe(label: string) {
    return (source: Observable<void>): Observable<void> =>
      source.pipe(
        catchError((e) => {
          console.error(`[cloud-sync] ${label} failed:`, e);
          this._status.set('error');
          this._lastError.set(this._formatError(e));
          return of(undefined);
        }),
      );
  }

  private _formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
      const e = err as { status?: number; message?: string; error?: unknown };
      const body = e.error;
      if (typeof body === 'string') return `${e.status ?? '?'}: ${body}`;
      if (typeof body === 'object' && body !== null) {
        const b = body as { error_summary?: string; error_description?: string };
        const detail = b.error_summary ?? b.error_description;
        if (detail) return `${e.status ?? '?'}: ${detail}`;
      }
      if (e.message) return e.message;
    }
    return String(err);
  }

}

/** Compare manifests by (kind, id, rev, deleted). Order-independent. */
const entriesEqual = (
  a: readonly ManifestEntryDto[],
  b: readonly ManifestEntryDto[],
): boolean => {
  if (a.length !== b.length) return false;
  const byKey = new Map<string, ManifestEntryDto>();
  for (const e of a) byKey.set(`${e.kind}:${e.id}`, e);
  for (const e of b) {
    const m = byKey.get(`${e.kind}:${e.id}`);
    if (m === undefined) return false;
    if (m.rev !== e.rev) return false;
    if ((m.deleted ?? false) !== (e.deleted ?? false)) return false;
  }
  return true;
};

// `firstValueFrom` with `defaultValue: undefined` so observables that complete
// without emitting (e.g. `of(undefined)` from typed-void providers) resolve
// cleanly instead of throwing `EmptyError`. Rolling our own with a manual
// Subscriber had a TDZ bug on synchronous emissions.
const firstValue = <T>(obs: Observable<T>): Promise<T> =>
  firstValueFrom(obs, { defaultValue: undefined as T });

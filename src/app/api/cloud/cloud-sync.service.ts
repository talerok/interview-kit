import { Injectable, Signal, inject, signal } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  defer,
  from,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { promisifyRequest } from 'idxdb-utils';
import {
  AnswerDto,
  AppDb,
  CategoryDto,
  INDEXES,
  InterviewDto,
  QuestionDto,
  STORES,
  TemplateDto,
  TombstoneDto,
  tombstoneKey,
} from '../storage';
import { CloudProvider } from './cloud-provider';
import {
  AGGREGATE_SCHEMA_VERSION,
  InterviewAggregateDto,
  TemplateAggregateDto,
} from './aggregate.dto';
import {
  AggregateKind,
  MANIFEST_SCHEMA_VERSION,
  ManifestDto,
  ManifestEntryDto,
} from './manifest.dto';

const PUSH_DEBOUNCE_MS = 1500;

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
      await this._pullInner(provider);
      await this._pushInner(provider);
      this._status.set('idle');
    }).pipe(this._errorPipe('sync'));
  }

  private _runPushOnly(): Observable<void> {
    return defer(async () => {
      const provider = this._delegate?.activeProvider() ?? null;
      if (provider === null) return;

      this._status.set('syncing');
      this._lastError.set(null);
      await this._pushInner(provider);
      this._status.set('idle');
    }).pipe(this._errorPipe('push'));
  }

  // ───────── pull ─────────

  private async _pullInner(provider: CloudProvider): Promise<void> {
    const manifest = await firstValue(provider.fetchManifest());
    if (manifest === null) return;

    this._delegate?.onVersionSynced?.(manifest.version ?? 0);

    const localRevs = await this._readLocalRevs();
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
          await this._deleteTemplateLocally(entry.id, entry.rev, entry.updatedAt);
        } else {
          await this._deleteInterviewLocally(entry.id, entry.rev, entry.updatedAt);
        }
        didWrite = true;
        continue;
      }

      const agg = await firstValue(provider.fetchAggregate(entry.kind, entry.id));
      if (agg === null) continue;
      if (entry.kind === 'template') {
        await this._writeTemplateAggregate(agg as TemplateAggregateDto);
      } else {
        await this._writeInterviewAggregate(agg as InterviewAggregateDto);
      }
      didWrite = true;
    }

    if (!didWrite) return;

    const pulled = this._delegate?.onDataPulled?.();
    if (pulled) {
      await firstValue(pulled);
    }
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

  private async _readLocalRevs(): Promise<LocalRevs> {
    const tx = this._appDb.database.transaction(
      [STORES.templates, STORES.interviews, STORES.tombstones],
      'readonly',
    );
    const templates = await tx.objectStore<TemplateDto>(STORES.templates).getAll();
    const interviews = await tx.objectStore<InterviewDto>(STORES.interviews).getAll();
    const tombstones = await tx.objectStore<TombstoneDto>(STORES.tombstones).getAll();
    await tx.done;
    return {
      templates: new Map(templates.map((t) => [t.id, t.rev])),
      interviews: new Map(interviews.map((i) => [i.id, i.rev])),
      tombstones: new Map(tombstones.map((t) => [t.key, t.rev])),
    };
  }

  private async _deleteTemplateLocally(id: string, rev: number, deletedAt: string): Promise<void> {
    const tx = this._appDb.database.transaction(
      [STORES.templates, STORES.categories, STORES.questions, STORES.tombstones],
      'readwrite',
    );
    const catsStore = tx.objectStore<CategoryDto>(STORES.categories);
    const catKeys = await promisifyRequest<IDBValidKey[]>(
      catsStore.raw.index(INDEXES.categories.byTemplate).getAllKeys(id),
    );
    for (const k of catKeys) await catsStore.delete(k);

    const qsStore = tx.objectStore<QuestionDto>(STORES.questions);
    const qKeys = await promisifyRequest<IDBValidKey[]>(
      qsStore.raw.index(INDEXES.questions.byTemplate).getAllKeys(id),
    );
    for (const k of qKeys) await qsStore.delete(k);

    await tx.objectStore<TemplateDto>(STORES.templates).delete(id);
    await tx.objectStore<TombstoneDto>(STORES.tombstones).put({
      key: tombstoneKey('template', id),
      kind: 'template',
      id,
      rev,
      deletedAt,
    });
    await tx.done;
  }

  private async _deleteInterviewLocally(id: string, rev: number, deletedAt: string): Promise<void> {
    const tx = this._appDb.database.transaction(
      [STORES.interviews, STORES.answers, STORES.tombstones],
      'readwrite',
    );
    const answersStore = tx.objectStore<AnswerDto>(STORES.answers);
    const keys = await promisifyRequest<IDBValidKey[]>(
      answersStore.raw.index(INDEXES.answers.byInterview).getAllKeys(id),
    );
    for (const k of keys) await answersStore.delete(k);
    await tx.objectStore<InterviewDto>(STORES.interviews).delete(id);
    await tx.objectStore<TombstoneDto>(STORES.tombstones).put({
      key: tombstoneKey('interview', id),
      kind: 'interview',
      id,
      rev,
      deletedAt,
    });
    await tx.done;
  }

  private async _writeTemplateAggregate(agg: TemplateAggregateDto): Promise<void> {
    const tx = this._appDb.database.transaction(
      [STORES.templates, STORES.categories, STORES.questions, STORES.tombstones],
      'readwrite',
    );
    await tx.objectStore<TemplateDto>(STORES.templates).put(agg.template);
    await this._replaceByIndex(
      tx.objectStore<CategoryDto>(STORES.categories),
      INDEXES.categories.byTemplate,
      agg.template.id,
      agg.categories,
    );
    await this._replaceByIndex(
      tx.objectStore<QuestionDto>(STORES.questions),
      INDEXES.questions.byTemplate,
      agg.template.id,
      agg.questions,
    );
    // Resurrected: the pull condition (cloud rev > local tombstone rev) just
    // wrote the entry back. Drop the stale tombstone so push doesn't re-delete.
    await tx.objectStore<TombstoneDto>(STORES.tombstones).delete(
      tombstoneKey('template', agg.template.id),
    );
    await tx.done;
  }

  private async _writeInterviewAggregate(agg: InterviewAggregateDto): Promise<void> {
    const tx = this._appDb.database.transaction(
      [STORES.interviews, STORES.answers, STORES.tombstones],
      'readwrite',
    );
    await tx.objectStore<InterviewDto>(STORES.interviews).put(agg.interview);
    await this._replaceByIndex(
      tx.objectStore<AnswerDto>(STORES.answers),
      INDEXES.answers.byInterview,
      agg.interview.id,
      agg.answers,
    );
    await tx.objectStore<TombstoneDto>(STORES.tombstones).delete(
      tombstoneKey('interview', agg.interview.id),
    );
    await tx.done;
  }

  /**
   * Atomic "replace all by foreign key": delete every row matching the index key,
   * then insert the new set. Same tx as the parent template/interview write.
   */
  private async _replaceByIndex<T extends { id: string }>(
    // store comes from a Transaction.objectStore<T>()
    store: { raw: IDBObjectStore; put: (v: T) => Promise<unknown>; delete: (key: IDBValidKey) => Promise<unknown> },
    indexName: string,
    foreignKey: string,
    items: readonly T[],
  ): Promise<void> {
    const existingKeys = await promisifyRequest<IDBValidKey[]>(
      store.raw.index(indexName).getAllKeys(foreignKey),
    );
    for (const k of existingKeys) await store.delete(k);
    for (const item of items) await store.put(item);
  }

  // ───────── push ─────────

  private async _pushInner(provider: CloudProvider): Promise<void> {
    // Read the cloud's current manifest version so we can monotonically
    // increment it. Concurrent pushes from two devices on the same account
    // will race here and the later writer wins — accepted limitation.
    const current = await firstValue(provider.fetchManifest());
    const nextVersion = (current?.version ?? 0) + 1;

    const snapshot = await this._readSnapshot();
    const entries: ManifestEntryDto[] = [];

    for (const template of snapshot.templates) {
      const agg: TemplateAggregateDto = {
        schemaVersion: AGGREGATE_SCHEMA_VERSION,
        template,
        categories: snapshot.categoriesByTemplate.get(template.id) ?? [],
        questions: snapshot.questionsByTemplate.get(template.id) ?? [],
      };
      await firstValue(provider.pushAggregate('template', template.id, agg));
      entries.push({
        kind: 'template',
        id: template.id,
        rev: template.rev,
        updatedAt: template.updatedAt,
      });
    }

    for (const interview of snapshot.interviews) {
      const agg: InterviewAggregateDto = {
        schemaVersion: AGGREGATE_SCHEMA_VERSION,
        interview,
        answers: snapshot.answersByInterview.get(interview.id) ?? [],
      };
      await firstValue(provider.pushAggregate('interview', interview.id, agg));
      entries.push({
        kind: 'interview',
        id: interview.id,
        rev: interview.rev,
        updatedAt: interview.updatedAt,
      });
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
      entries.push({
        kind: tomb.kind,
        id: tomb.id,
        rev: tomb.rev,
        updatedAt: tomb.deletedAt,
        deleted: true,
      });
    }

    const manifest: ManifestDto = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      entries,
    };
    await firstValue(provider.pushManifest(manifest));
    this._delegate?.onVersionSynced?.(nextVersion);

    const completed = this._delegate?.onSyncCompleted(provider);
    if (completed) {
      await firstValue(completed);
    }
  }

  private _errorPipe(label: string) {
    return (source: Observable<void>): Observable<void> =>
      source.pipe(
        tap({
          error: (e) => {
            console.error(`[cloud-sync] ${label} failed:`, e);
            this._status.set('error');
            this._lastError.set(this._formatError(e));
          },
        }),
        catchError(() => of(undefined)),
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

  private async _readSnapshot(): Promise<Snapshot> {
    const tx = this._appDb.database.transaction(
      [
        STORES.templates,
        STORES.categories,
        STORES.questions,
        STORES.interviews,
        STORES.answers,
        STORES.tombstones,
      ],
      'readonly',
    );
    const templates = await tx.objectStore<TemplateDto>(STORES.templates).getAll();
    const categories = await tx.objectStore<CategoryDto>(STORES.categories).getAll();
    const questions = await tx.objectStore<QuestionDto>(STORES.questions).getAll();
    const interviews = await tx.objectStore<InterviewDto>(STORES.interviews).getAll();
    const answers = await tx.objectStore<AnswerDto>(STORES.answers).getAll();
    const tombstones = await tx.objectStore<TombstoneDto>(STORES.tombstones).getAll();
    await tx.done;

    return {
      templates,
      interviews,
      categoriesByTemplate: groupBy(categories, (c) => c.templateId),
      questionsByTemplate: groupBy(questions, (q) => q.templateId),
      answersByInterview: groupBy(answers, (a) => a.interviewId),
      tombstones,
    };
  }
}

interface LocalRevs {
  readonly templates: Map<string, number>;
  readonly interviews: Map<string, number>;
  readonly tombstones: Map<string, number>;
}

interface Snapshot {
  readonly templates: readonly TemplateDto[];
  readonly interviews: readonly InterviewDto[];
  readonly categoriesByTemplate: Map<string, CategoryDto[]>;
  readonly questionsByTemplate: Map<string, QuestionDto[]>;
  readonly answersByInterview: Map<string, AnswerDto[]>;
  readonly tombstones: readonly TombstoneDto[];
}

const groupBy = <T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> => {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list === undefined) {
      out.set(k, [item]);
    } else {
      list.push(item);
    }
  }
  return out;
};

const firstValue = <T>(obs: Observable<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const sub = from(obs).subscribe({
      next: (v) => {
        resolve(v);
        sub.unsubscribe();
      },
      error: (e) => reject(e),
      complete: () => resolve(undefined as T),
    });
  });

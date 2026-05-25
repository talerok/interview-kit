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
} from '../storage';
import { CLOUD_PROVIDERS, CloudProvider } from './cloud-provider';
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
   * Called when a sync round completes successfully. Returns an Observable so the
   * sync flow can await persist without leaking a `.subscribe()` inside Actions.
   */
  readonly onSyncCompleted: (provider: CloudProvider) => Observable<void>;
}

@Injectable({ providedIn: 'root' })
export class CloudSyncService {
  private readonly _appDb = inject(AppDb);
  private readonly _providers = inject(CLOUD_PROVIDERS);

  private readonly _trigger$ = new Subject<void>();
  private readonly _status = signal<SyncStatus>('idle');
  private readonly _lastError = signal<string | null>(null);
  private _delegate: CloudSyncDelegate | null = null;

  readonly status: Signal<SyncStatus> = this._status.asReadonly();
  readonly lastError: Signal<string | null> = this._lastError.asReadonly();

  constructor() {
    this._trigger$
      .pipe(
        debounceTime(PUSH_DEBOUNCE_MS),
        switchMap(() => this._push()),
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

  /** Force a synchronous push round. */
  pushNow(): Observable<void> {
    return this._push();
  }

  private _push(): Observable<void> {
    return defer(async () => {
      const provider = this._delegate?.activeProvider() ?? null;
      if (provider === null) return;

      this._status.set('syncing');
      this._lastError.set(null);
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

      const manifest: ManifestDto = {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        entries,
      };
      await firstValue(provider.pushManifest(manifest));

      const completed = this._delegate?.onSyncCompleted(provider);
      if (completed) {
        await firstValue(completed);
      }
      this._status.set('idle');
    }).pipe(
      tap({
        error: (e) => {
          console.error('[cloud-sync] push failed:', e);
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
      [STORES.templates, STORES.categories, STORES.questions, STORES.interviews, STORES.answers],
      'readonly',
    );
    const templates = await tx.objectStore<TemplateDto>(STORES.templates).getAll();
    const categories = await tx.objectStore<CategoryDto>(STORES.categories).getAll();
    const questions = await tx.objectStore<QuestionDto>(STORES.questions).getAll();
    const interviews = await tx.objectStore<InterviewDto>(STORES.interviews).getAll();
    const answers = await tx.objectStore<AnswerDto>(STORES.answers).getAll();
    await tx.done;

    void promisifyRequest; // silence unused import in this file (kept for future indexed reads)
    void INDEXES;

    const categoriesByTemplate = groupBy(categories, (c) => c.templateId);
    const questionsByTemplate = groupBy(questions, (q) => q.templateId);
    const answersByInterview = groupBy(answers, (a) => a.interviewId);

    return {
      templates,
      interviews,
      categoriesByTemplate,
      questionsByTemplate,
      answersByInterview,
    };
  }
}

interface Snapshot {
  readonly templates: readonly TemplateDto[];
  readonly interviews: readonly InterviewDto[];
  readonly categoriesByTemplate: Map<string, CategoryDto[]>;
  readonly questionsByTemplate: Map<string, QuestionDto[]>;
  readonly answersByInterview: Map<string, AnswerDto[]>;
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

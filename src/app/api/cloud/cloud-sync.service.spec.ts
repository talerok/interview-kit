import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppDb,
  STORES,
  TemplateDto,
  TombstoneDto,
  tombstoneKey,
} from '../storage';
import { createFakeAppDb } from '../storage/testing/fake-app-db';
import { CloudProvider } from './cloud-provider';
import { ManifestDto } from './dto';
import { CloudSyncService } from './cloud-sync.service';

// ───────── helpers ─────────

const templateDto = (id: string, rev: number): TemplateDto => ({
  id,
  code: 'TPL',
  name: 'Tpl',
  description: '',
  color: '#000',
  rev,
  categoryCount: 0,
  questionCount: 0,
  createdAt: '2026-05-25T10:00:00.000Z',
  updatedAt: '2026-05-25T10:00:00.000Z',
});

const tombstoneFor = (kind: 'template' | 'interview', id: string, rev: number): TombstoneDto => ({
  key: tombstoneKey(kind, id),
  kind,
  id,
  rev,
  deletedAt: '2026-05-25T10:30:00.000Z',
});

const seedTemplate = async (appDb: AppDb, template: TemplateDto): Promise<void> => {
  const tx = appDb.database.transaction(STORES.templates, 'readwrite');
  await tx.objectStore<TemplateDto>(STORES.templates).put(template);
  await tx.done;
};

const seedTombstone = async (appDb: AppDb, tomb: TombstoneDto): Promise<void> => {
  const tx = appDb.database.transaction(STORES.tombstones, 'readwrite');
  await tx.objectStore<TombstoneDto>(STORES.tombstones).put(tomb);
  await tx.done;
};

type StubProvider = CloudProvider & {
  fetchManifest: ReturnType<typeof vi.fn>;
  pushManifest: ReturnType<typeof vi.fn>;
  pushAggregate: ReturnType<typeof vi.fn>;
  deleteAggregate: ReturnType<typeof vi.fn>;
  fetchAggregate: ReturnType<typeof vi.fn>;
};

const stubProvider = (manifest: ManifestDto | null): StubProvider => {
  return {
    kind: 'dropbox',
    label: 'Dropbox',
    defaultPath: '/Apps/InterviewKit',
    beginAuthorize: vi.fn(),
    completeAuthorize: vi.fn(),
    disconnect: vi.fn(),
    fetchManifest: vi.fn(() => of(manifest)),
    pushManifest: vi.fn(() => of(undefined)),
    fetchAggregate: vi.fn(() => of(null)),
    pushAggregate: vi.fn(() => of(undefined)),
    deleteAggregate: vi.fn(() => of(undefined)),
  } as unknown as StubProvider;
};

const setupService = async (
  provider: StubProvider,
): Promise<{ service: CloudSyncService; appDb: AppDb }> => {
  const appDb = await createFakeAppDb();
  TestBed.configureTestingModule({
    providers: [{ provide: AppDb, useValue: appDb }],
  });
  const service = TestBed.inject(CloudSyncService);
  service.setDelegate({
    activeProvider: () => provider,
    onSyncCompleted: () => of(undefined),
  });
  return { service, appDb };
};

const firstFrom = <T>(obs: Observable<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });

// IDB key-only helpers: pull stores empty `manifest.entries` to avoid pull paths.
const emptyCloudManifest = (version = 7): ManifestDto => ({
  schemaVersion: 1,
  version,
  updatedAt: '2026-05-25T09:00:00.000Z',
  entries: [],
});

// ───────── tests ─────────

describe('CloudSyncService', () => {
  describe('push: no-op detection', () => {
    it('skips pushManifest and pushAggregate when cloud manifest matches local state', async () => {
      const provider = stubProvider({
        schemaVersion: 1,
        version: 42,
        updatedAt: '2026-05-25T09:00:00.000Z',
        entries: [
          { kind: 'template', id: 't1', rev: 3, updatedAt: '2026-05-25T10:00:00.000Z' },
        ],
      });
      const { service, appDb } = await setupService(provider);
      await seedTemplate(appDb, templateDto('t1', 3));

      const versionsSeen: number[] = [];
      service.setDelegate({
        activeProvider: () => provider,
        onSyncCompleted: () => of(undefined),
        onVersionSynced: (v) => versionsSeen.push(v),
      });

      await firstFrom(service.syncNow());

      expect(provider.pushManifest).not.toHaveBeenCalled();
      expect(provider.pushAggregate).not.toHaveBeenCalled();
      // Last surfaced version is the cloud's own — no bump.
      expect(versionsSeen.at(-1)).toBe(42);
    });

    it('pushes when local has a new template not yet in cloud manifest', async () => {
      const provider = stubProvider(emptyCloudManifest(5));
      const { service, appDb } = await setupService(provider);
      await seedTemplate(appDb, templateDto('t1', 1));

      const versionsSeen: number[] = [];
      service.setDelegate({
        activeProvider: () => provider,
        onSyncCompleted: () => of(undefined),
        onVersionSynced: (v) => versionsSeen.push(v),
      });

      await firstFrom(service.syncNow());

      expect(provider.pushAggregate).toHaveBeenCalledTimes(1);
      expect(provider.pushAggregate.mock.calls[0][0]).toBe('template');
      expect(provider.pushAggregate.mock.calls[0][1]).toBe('t1');
      expect(provider.pushManifest).toHaveBeenCalledTimes(1);

      const pushed = provider.pushManifest.mock.calls[0][0] as ManifestDto;
      expect(pushed.version).toBe(6); // bumped from 5
      expect(pushed.entries).toHaveLength(1);
      expect(pushed.entries[0]).toMatchObject({ kind: 'template', id: 't1', rev: 1 });
      expect(versionsSeen.at(-1)).toBe(6);
    });
  });

  describe('push: tombstones', () => {
    it('emits deleted: true manifest entries and calls deleteAggregate', async () => {
      const provider = stubProvider(emptyCloudManifest(1));
      const { service, appDb } = await setupService(provider);
      await seedTombstone(appDb, tombstoneFor('template', 't1', 4));

      await firstFrom(service.syncNow());

      expect(provider.deleteAggregate).toHaveBeenCalledTimes(1);
      expect(provider.deleteAggregate).toHaveBeenCalledWith('template', 't1');

      const pushed = provider.pushManifest.mock.calls[0][0] as ManifestDto;
      expect(pushed.entries).toHaveLength(1);
      expect(pushed.entries[0]).toMatchObject({
        kind: 'template',
        id: 't1',
        rev: 4,
        deleted: true,
      });
    });

    it('tolerates deleteAggregate errors (file may already be gone)', async () => {
      const provider = stubProvider(emptyCloudManifest());
      provider.deleteAggregate.mockImplementationOnce(() => {
        throw new Error('404 not found');
      });
      const { service, appDb } = await setupService(provider);
      await seedTombstone(appDb, tombstoneFor('template', 't1', 4));

      // Should not reject — error is logged + swallowed.
      await firstFrom(service.syncNow());

      expect(provider.pushManifest).toHaveBeenCalled();
    });
  });

  describe('push: no-op when nothing in IDB and cloud manifest is empty', () => {
    it('matches an empty cloud and skips writes', async () => {
      const provider = stubProvider(emptyCloudManifest(3));
      const { service } = await setupService(provider);

      const versionsSeen: number[] = [];
      service.setDelegate({
        activeProvider: () => provider,
        onSyncCompleted: () => of(undefined),
        onVersionSynced: (v) => versionsSeen.push(v),
      });

      await firstFrom(service.syncNow());

      expect(provider.pushManifest).not.toHaveBeenCalled();
      expect(provider.pushAggregate).not.toHaveBeenCalled();
      expect(versionsSeen.at(-1)).toBe(3);
    });
  });

  // The implementation file's entriesEqual helper is module-private and tested
  // indirectly through the no-op cases above. The (kind, id, rev, deleted)
  // contract is what consumers actually see.
});

describe('CloudSyncService — without active provider', () => {
  it('syncNow is a no-op', async () => {
    const appDb = await createFakeAppDb();
    TestBed.configureTestingModule({
      providers: [{ provide: AppDb, useValue: appDb }],
    });
    const service = TestBed.inject(CloudSyncService);
    service.setDelegate({
      activeProvider: () => null,
      onSyncCompleted: () => of(undefined),
    });

    await firstFrom(service.syncNow());
    // No provider methods were called — nothing to assert beyond not throwing.
    expect(service.status()).toBe('idle');
  });
});


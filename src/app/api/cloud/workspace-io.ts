import { ObjectStore, promisifyRequest } from 'idxdb-utils';
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
import { InterviewAggregateDto, TemplateAggregateDto } from './dto';

// Pure IDB I/O for cloud sync: snapshot the local workspace, write incoming
// cloud aggregates atomically, cascade-delete with a fresh tombstone, and
// read just enough rev info for the pull-side conflict resolution.
//
// No knowledge of CloudProvider/manifest format lives here — these helpers
// are the seam between "what cloud sync needs from local storage" and the
// raw IDB transactions backing it.

export interface Snapshot {
  readonly templates: readonly TemplateDto[];
  readonly interviews: readonly InterviewDto[];
  readonly categoriesByTemplate: Map<string, CategoryDto[]>;
  readonly questionsByTemplate: Map<string, QuestionDto[]>;
  readonly answersByInterview: Map<string, AnswerDto[]>;
  readonly tombstones: readonly TombstoneDto[];
}

export interface LocalRevs {
  readonly templates: Map<string, number>;
  readonly interviews: Map<string, number>;
  readonly tombstones: Map<string, number>;
}

export const readSnapshot = async (appDb: AppDb): Promise<Snapshot> => {
  const tx = appDb.database.transaction(
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
};

export const readLocalRevs = async (appDb: AppDb): Promise<LocalRevs> => {
  const tx = appDb.database.transaction(
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
};

/** Atomic upsert of a template aggregate from cloud, dropping any stale tombstone. */
export const writeTemplateAggregate = async (
  appDb: AppDb,
  agg: TemplateAggregateDto,
): Promise<void> => {
  const tx = appDb.database.transaction(
    [STORES.templates, STORES.categories, STORES.questions, STORES.tombstones],
    'readwrite',
  );
  await tx.objectStore<TemplateDto>(STORES.templates).put(agg.template);
  await replaceByIndex(
    tx.objectStore<CategoryDto>(STORES.categories),
    INDEXES.categories.byTemplate,
    agg.template.id,
    agg.categories,
  );
  await replaceByIndex(
    tx.objectStore<QuestionDto>(STORES.questions),
    INDEXES.questions.byTemplate,
    agg.template.id,
    agg.questions,
  );
  // Resurrected: the pull condition (cloud rev > local tombstone rev) just
  // wrote the entry back. Drop the stale tombstone so push doesn't re-delete.
  await tx
    .objectStore<TombstoneDto>(STORES.tombstones)
    .delete(tombstoneKey('template', agg.template.id));
  await tx.done;
};

/** Atomic upsert of an interview aggregate from cloud, dropping any stale tombstone. */
export const writeInterviewAggregate = async (
  appDb: AppDb,
  agg: InterviewAggregateDto,
): Promise<void> => {
  const tx = appDb.database.transaction(
    [STORES.interviews, STORES.answers, STORES.tombstones],
    'readwrite',
  );
  await tx.objectStore<InterviewDto>(STORES.interviews).put(agg.interview);
  await replaceByIndex(
    tx.objectStore<AnswerDto>(STORES.answers),
    INDEXES.answers.byInterview,
    agg.interview.id,
    agg.answers,
  );
  await tx
    .objectStore<TombstoneDto>(STORES.tombstones)
    .delete(tombstoneKey('interview', agg.interview.id));
  await tx.done;
};

/** Cascade-delete a template + its categories/questions, recording a tombstone. */
export const deleteTemplateLocally = async (
  appDb: AppDb,
  id: string,
  rev: number,
  deletedAt: string,
): Promise<void> => {
  const tx = appDb.database.transaction(
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
};

/** Cascade-delete an interview + its answers, recording a tombstone. */
export const deleteInterviewLocally = async (
  appDb: AppDb,
  id: string,
  rev: number,
  deletedAt: string,
): Promise<void> => {
  const tx = appDb.database.transaction(
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
};

/**
 * Atomic "replace all by foreign key": delete every row matching the index
 * key, then insert the new set. Runs inside the parent template/interview tx.
 */
const replaceByIndex = async <T extends { id: string }>(
  store: ObjectStore<T>,
  indexName: string,
  foreignKey: string,
  items: readonly T[],
): Promise<void> => {
  const existingKeys = await promisifyRequest<IDBValidKey[]>(
    store.raw.index(indexName).getAllKeys(foreignKey),
  );
  for (const k of existingKeys) await store.delete(k);
  for (const item of items) await store.put(item);
};

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

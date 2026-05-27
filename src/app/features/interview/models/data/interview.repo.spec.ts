import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppDb, STORES, TombstoneDto, tombstoneKey } from '../../../../api/storage';
import { createFakeAppDb } from '../../../../api/storage/testing/fake-app-db';
import { newId } from '../../../../shared/utils';
import {
  Answer,
  AnswerId,
  Interview,
  InterviewAggregate,
  InterviewId,
} from '../../interfaces/interview';
import { TemplateId } from '../../../templates/interfaces/template';
import { InterviewRepo } from './interview.repo';

const TID: TemplateId = 't1' as TemplateId;

const buildInterview = (id: InterviewId): Interview => ({
  id,
  templateId: TID,
  status: 'in-progress',
  candidate: { name: 'Анна', position: 'Backend', date: '2026-05-20' },
  durationMin: 0,
  notes: '',
  rev: 0,
  answersCount: 0,
  answeredCount: 0,
  skippedCount: 0,
  avg: 0,
  createdAt: '2026-05-20T10:00:00.000Z',
  updatedAt: '2026-05-20T10:00:00.000Z',
});

const buildAnswer = (interviewId: InterviewId, id: string, order: number): Answer => ({
  id: id as AnswerId,
  interviewId,
  questionId: `q-${id}` as never,
  categoryId: null,
  questionKind: 'verbal',
  questionText: `Q ${id}`,
  questionWeight: 1,
  questionCriteria: '',
  score: null,
  comment: '',
  skipped: false,
  order,
});

const buildAggregate = (
  id: InterviewId,
  answerCount: number,
): InterviewAggregate => ({
  interview: { ...buildInterview(id), answersCount: answerCount },
  answers: Array.from({ length: answerCount }, (_, i) => buildAnswer(id, `a${i}`, i)),
});

describe('InterviewRepo', () => {
  let repo: InterviewRepo;
  let appDb: AppDb;
  let iid: InterviewId;

  beforeEach(async () => {
    appDb = await createFakeAppDb();
    TestBed.configureTestingModule({ providers: [{ provide: AppDb, useValue: appDb }] });
    repo = TestBed.inject(InterviewRepo);

    iid = newId<'InterviewId'>();
    await firstValueFrom(repo.createAggregate(buildAggregate(iid, 3)));
  });

  const readTombstone = async (id: string): Promise<TombstoneDto | undefined> => {
    const tx = appDb.database.transaction(STORES.tombstones, 'readonly');
    const t = await tx.objectStore<TombstoneDto>(STORES.tombstones).get(
      tombstoneKey('interview', id),
    );
    await tx.done;
    return t;
  };

  it('list() returns persisted interviews', async () => {
    const list = await firstValueFrom(repo.list());
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(iid);
  });

  it('get() returns the full aggregate, answers ordered by `order`', async () => {
    const result = (await firstValueFrom(repo.get(iid)))!;
    expect(result.interview.id).toBe(iid);
    expect(result.answers.map((a) => a.order)).toEqual([0, 1, 2]);
  });

  it('get() returns null for a missing interview', async () => {
    const missing = await firstValueFrom(repo.get(newId<'InterviewId'>()));
    expect(missing).toBeNull();
  });

  describe('updateAnswer', () => {
    it('recomputes stats and bumps rev on every save', async () => {
      const { answers } = (await firstValueFrom(repo.get(iid)))!;
      const a0 = answers[0];

      const { interview, answer } = await firstValueFrom(
        repo.updateAnswer({ ...a0, score: 5, comment: 'great' }),
      );

      expect(answer.score).toBe(5);
      expect(answer.comment).toBe('great');
      expect(interview.answeredCount).toBe(1);
      expect(interview.skippedCount).toBe(0);
      expect(interview.avg).toBe(5);
      expect(interview.rev).toBe(1);
    });

    it('counts skipped answers separately and excludes them from avg', async () => {
      const { answers } = (await firstValueFrom(repo.get(iid)))!;
      await firstValueFrom(repo.updateAnswer({ ...answers[0], score: 5 }));
      await firstValueFrom(repo.updateAnswer({ ...answers[1], score: 3 }));
      const { interview } = await firstValueFrom(
        repo.updateAnswer({ ...answers[2], skipped: true }),
      );

      expect(interview.answeredCount).toBe(2);
      expect(interview.skippedCount).toBe(1);
      expect(interview.avg).toBe(4); // (5 + 3) / 2
      expect(interview.rev).toBe(3); // bumped three times
    });

    it('skipped overrides score: a skipped answer with a stale score does not contribute to avg', async () => {
      const { answers } = (await firstValueFrom(repo.get(iid)))!;
      // Save a score, then skip the same answer.
      await firstValueFrom(repo.updateAnswer({ ...answers[0], score: 4 }));
      const { interview } = await firstValueFrom(
        repo.updateAnswer({ ...answers[0], score: 4, skipped: true }),
      );
      expect(interview.answeredCount).toBe(0);
      expect(interview.skippedCount).toBe(1);
      expect(interview.avg).toBe(0);
    });
  });

  describe('updateInterview', () => {
    it('bumps rev and preserves answers', async () => {
      const before = (await firstValueFrom(repo.get(iid)))!.interview;
      const updated = await firstValueFrom(
        repo.updateInterview({ ...before, status: 'completed', durationMin: 42 }),
      );
      expect(updated.status).toBe('completed');
      expect(updated.durationMin).toBe(42);
      expect(updated.rev).toBe(before.rev + 1);

      const aggr = (await firstValueFrom(repo.get(iid)))!;
      expect(aggr.answers).toHaveLength(3);
    });
  });

  describe('delete', () => {
    it('writes a tombstone with rev = (last interview rev) + 1', async () => {
      const { answers } = (await firstValueFrom(repo.get(iid)))!;
      const { interview } = await firstValueFrom(
        repo.updateAnswer({ ...answers[0], score: 5 }),
      );
      await firstValueFrom(repo.delete(iid));

      const tomb = await readTombstone(iid);
      expect(tomb).toBeDefined();
      expect(tomb!.kind).toBe('interview');
      expect(tomb!.id).toBe(iid);
      expect(tomb!.rev).toBe(interview.rev + 1);
    });

    it('removes the interview and all its answers', async () => {
      await firstValueFrom(repo.delete(iid));
      const missing = await firstValueFrom(repo.get(iid));
      expect(missing).toBeNull();

      // also confirm: a sibling interview's answers must NOT be touched
      const otherId = newId<'InterviewId'>();
      await firstValueFrom(repo.createAggregate(buildAggregate(otherId, 2)));
      const other = (await firstValueFrom(repo.get(otherId)))!;
      expect(other.answers).toHaveLength(2);
    });
  });

  it('createAggregate followed by a fresh updateAnswer round-trip preserves identity', async () => {
    const newIid = newId<'InterviewId'>();
    await firstValueFrom(repo.createAggregate(buildAggregate(newIid, 2)));
    const { answers } = (await firstValueFrom(repo.get(newIid)))!;
    const result = await firstValueFrom(
      repo.updateAnswer({ ...answers[0], score: 3, comment: 'meh' }),
    );
    expect(result.answer.id).toBe(answers[0].id);
    expect(result.interview.id).toBe(newIid);
  });
});

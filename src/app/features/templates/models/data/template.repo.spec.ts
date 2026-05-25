import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppDb } from '../../../../api/storage';
import { createFakeAppDb } from '../../../../api/storage/testing/fake-app-db';
import { newId } from '../../../../shared/utils';
import {
  Category,
  CategoryId,
  Question,
  Template,
  TemplateAggregate,
  TemplateId,
} from '../../interfaces/template';
import { TemplateRepo } from './template.repo';

const buildAggregate = (
  id: TemplateId,
  categoryCount = 0,
  questionCount = 0,
): TemplateAggregate => ({
  template: {
    id,
    code: 'TPL',
    name: 'Backend',
    description: '',
    color: '#000',
    rev: 0,
    categoryCount,
    questionCount,
    createdAt: '2026-05-25T10:00:00.000Z',
    updatedAt: '2026-05-25T10:00:00.000Z',
  },
  categories: [],
  questions: [],
});

describe('TemplateRepo', () => {
  let repo: TemplateRepo;
  let tid: TemplateId;

  beforeEach(async () => {
    const appDb = await createFakeAppDb();
    TestBed.configureTestingModule({ providers: [{ provide: AppDb, useValue: appDb }] });
    repo = TestBed.inject(TemplateRepo);

    tid = newId<'TemplateId'>();
    await firstValueFrom(repo.createAggregate(buildAggregate(tid)));
  });

  it('list() returns persisted templates', async () => {
    const list = await firstValueFrom(repo.list());
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(tid);
  });

  it('get() returns the full aggregate with ordered children', async () => {
    const result = await firstValueFrom(repo.get(tid));
    expect(result).not.toBeNull();
    expect(result!.template.id).toBe(tid);
    expect(result!.categories).toEqual([]);
    expect(result!.questions).toEqual([]);
  });

  it('get() returns null for a missing template', async () => {
    const missing = await firstValueFrom(repo.get(newId<'TemplateId'>()));
    expect(missing).toBeNull();
  });

  describe('addCategory', () => {
    it('inserts the category and bumps template.rev + categoryCount atomically', async () => {
      const before = (await firstValueFrom(repo.get(tid)))!.template;

      const { template, category } = await firstValueFrom(
        repo.addCategory({ templateId: tid, label: '  Алгоритмы  ', color: '#123' }),
      );

      expect(category.label).toBe('Алгоритмы'); // trimmed
      expect(category.order).toBe(0);
      expect(category.templateId).toBe(tid);

      expect(template.rev).toBe(before.rev + 1);
      expect(template.categoryCount).toBe(1);

      // persisted
      const refetched = (await firstValueFrom(repo.get(tid)))!;
      expect(refetched.template.rev).toBe(template.rev);
      expect(refetched.template.categoryCount).toBe(1);
      expect(refetched.categories).toHaveLength(1);
    });

    it('assigns order = current categoryCount (no gaps)', async () => {
      await firstValueFrom(repo.addCategory({ templateId: tid, label: 'A', color: '#1' }));
      const { category: c2 } = await firstValueFrom(
        repo.addCategory({ templateId: tid, label: 'B', color: '#2' }),
      );
      expect(c2.order).toBe(1);
    });
  });

  describe('deleteCategory', () => {
    it('removes the category, unlinks its questions, and decrements categoryCount', async () => {
      const { category: cat } = await firstValueFrom(
        repo.addCategory({ templateId: tid, label: 'Algo', color: '#1' }),
      );
      const { question: q } = await firstValueFrom(
        repo.addQuestion({ templateId: tid, text: 'Q?', categoryId: cat.id, weight: 2 }),
      );

      await firstValueFrom(repo.deleteCategory(tid, cat.id));

      const refetched = (await firstValueFrom(repo.get(tid)))!;
      expect(refetched.categories).toHaveLength(0);
      expect(refetched.template.categoryCount).toBe(0);

      // question survives, but unlinked
      const survivor = refetched.questions.find((x) => x.id === q.id);
      expect(survivor).toBeDefined();
      expect(survivor!.categoryId).toBeNull();
      expect(refetched.template.questionCount).toBe(1);
    });

    it('clamps categoryCount at 0 even on repeated deletes', async () => {
      const { category: cat } = await firstValueFrom(
        repo.addCategory({ templateId: tid, label: 'X', color: '#1' }),
      );
      await firstValueFrom(repo.deleteCategory(tid, cat.id));
      // calling again must not produce negative counts
      await firstValueFrom(repo.deleteCategory(tid, cat.id));
      const { template } = (await firstValueFrom(repo.get(tid)))!;
      expect(template.categoryCount).toBe(0);
    });
  });

  describe('addQuestion / deleteQuestion', () => {
    it('addQuestion trims text, assigns order, bumps counters', async () => {
      const { template, question } = await firstValueFrom(
        repo.addQuestion({
          templateId: tid,
          text: '  Что такое eventual consistency?  ',
          categoryId: null,
          weight: 3,
        }),
      );
      expect(question.text).toBe('Что такое eventual consistency?');
      expect(question.order).toBe(0);
      expect(template.questionCount).toBe(1);
      expect(template.rev).toBe(1);
    });

    it('deleteQuestion decrements questionCount and bumps rev', async () => {
      const { question: q } = await firstValueFrom(
        repo.addQuestion({ templateId: tid, text: 'A', categoryId: null, weight: 1 }),
      );
      const { template } = await firstValueFrom(repo.deleteQuestion(tid, q.id));
      expect(template.questionCount).toBe(0);
      expect(template.rev).toBe(2);
    });

    it('deleteQuestion clamps questionCount at 0', async () => {
      const { question: q } = await firstValueFrom(
        repo.addQuestion({ templateId: tid, text: 'A', categoryId: null, weight: 1 }),
      );
      await firstValueFrom(repo.deleteQuestion(tid, q.id));
      await firstValueFrom(repo.deleteQuestion(tid, q.id));
      const { template } = (await firstValueFrom(repo.get(tid)))!;
      expect(template.questionCount).toBe(0);
    });
  });

  describe('updateMeta', () => {
    it('trims name, recomputes code, bumps rev', async () => {
      const { template } = (await firstValueFrom(repo.get(tid)))!;
      const updated = await firstValueFrom(
        repo.updateMeta({ templateId: tid, name: '  Senior Frontend  ' }),
      );
      expect(updated.name).toBe('Senior Frontend');
      expect(updated.code).toBe('SF');
      expect(updated.rev).toBe(template.rev + 1);
    });

    it('does not change code when name is omitted', async () => {
      const original = (await firstValueFrom(repo.get(tid)))!.template;
      const updated = await firstValueFrom(
        repo.updateMeta({ templateId: tid, description: 'new desc' }),
      );
      expect(updated.code).toBe(original.code);
      expect(updated.description).toBe('new desc');
    });
  });

  describe('delete', () => {
    it('removes the template and all its categories + questions', async () => {
      const { category: cat } = await firstValueFrom(
        repo.addCategory({ templateId: tid, label: 'C', color: '#1' }),
      );
      await firstValueFrom(
        repo.addQuestion({ templateId: tid, text: 'Q', categoryId: cat.id, weight: 1 }),
      );

      await firstValueFrom(repo.delete(tid));

      const found = await firstValueFrom(repo.get(tid));
      expect(found).toBeNull();
      const list = await firstValueFrom(repo.list());
      expect(list).toEqual([]);
    });
  });

  it('rev bumps monotonically across mixed mutations', async () => {
    const before = (await firstValueFrom(repo.get(tid)))!.template;
    const { template: t1 } = await firstValueFrom(
      repo.addCategory({ templateId: tid, label: 'A', color: '#1' }),
    );
    const { template: t2 } = await firstValueFrom(
      repo.addQuestion({ templateId: tid, text: 'Q', categoryId: null, weight: 1 }),
    );
    const t3 = await firstValueFrom(repo.updateMeta({ templateId: tid, name: 'Renamed' }));
    expect(t1.rev).toBe(before.rev + 1);
    expect(t2.rev).toBe(t1.rev + 1);
    expect(t3.rev).toBe(t2.rev + 1);
  });
});

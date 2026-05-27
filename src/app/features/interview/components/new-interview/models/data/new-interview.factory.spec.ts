import { describe, expect, it } from 'vitest';
import { asId } from '../../../../../../shared/utils';
import {
  CategoryId,
  Question,
  QuestionId,
  TemplateId,
} from '../../../../../templates/interfaces/template';
import { CategoryPick, UNCATEGORIZED_KEY } from '../state/new-interview.store';
import { buildNewInterviewAggregate } from './new-interview.factory';

const TID = asId<'TemplateId'>('t1') as TemplateId;
const CAT_A = asId<'CategoryId'>('ca') as CategoryId;
const CAT_B = asId<'CategoryId'>('cb') as CategoryId;

const question = (id: string, categoryId: CategoryId, order: number): Question => ({
  kind: 'verbal',
  id: asId<'QuestionId'>(id) as QuestionId,
  templateId: TID,
  categoryId,
  text: `q ${id}`,
  weight: 1,
  order,
  criteria: '',
});

const pick = (
  categoryId: CategoryId,
  count: number,
  mode: 'random' | 'first' = 'first',
  enabled = true,
): CategoryPick => ({ categoryId, enabled, count, mode });

const buckets = {
  [CAT_A]: [question('a1', CAT_A, 0), question('a2', CAT_A, 1), question('a3', CAT_A, 2)],
  [CAT_B]: [question('b1', CAT_B, 0), question('b2', CAT_B, 1)],
};

const candidate = { name: 'Анна', position: 'Backend', date: '2026-05-25' };

describe('buildNewInterviewAggregate', () => {
  it("'first' mode takes questions in their order field", () => {
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [pick(CAT_A, 2, 'first')],
      questionsByCategory: buckets,
      runOrder: 'sequential',
    });
    expect(out.answers.map((a) => a.questionId)).toEqual(['a1', 'a2']);
  });

  it("'first' mode clamps count to available questions", () => {
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [pick(CAT_A, 99, 'first')],
      questionsByCategory: buckets,
      runOrder: 'sequential',
    });
    expect(out.answers).toHaveLength(3);
  });

  it("disabled picks contribute zero questions", () => {
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [pick(CAT_A, 2, 'first', false), pick(CAT_B, 1, 'first')],
      questionsByCategory: buckets,
      runOrder: 'sequential',
    });
    expect(out.answers).toHaveLength(1);
    expect(out.answers[0].questionId).toBe('b1');
  });

  it('sequential run-order groups answers by pick order', () => {
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [pick(CAT_B, 2, 'first'), pick(CAT_A, 2, 'first')],
      questionsByCategory: buckets,
      runOrder: 'sequential',
    });
    expect(out.answers.map((a) => a.categoryId)).toEqual([CAT_B, CAT_B, CAT_A, CAT_A]);
  });

  it('answer.order is contiguous 0..N-1 regardless of run-order', () => {
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [pick(CAT_A, 3, 'first'), pick(CAT_B, 2, 'first')],
      questionsByCategory: buckets,
      runOrder: 'shuffled',
    });
    expect(out.answers.map((a) => a.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it('interview seed has rev=1, status=in-progress, zero stats', () => {
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [pick(CAT_A, 1, 'first')],
      questionsByCategory: buckets,
      runOrder: 'sequential',
    });
    expect(out.interview.rev).toBe(1);
    expect(out.interview.status).toBe('in-progress');
    expect(out.interview.answeredCount).toBe(0);
    expect(out.interview.skippedCount).toBe(0);
    expect(out.interview.avg).toBe(0);
    expect(out.interview.answersCount).toBe(1);
  });

  it('uncategorized pick pulls from the UNCATEGORIZED_KEY bucket; answer.categoryId stays null', () => {
    const uncatQuestion: Question = {
      kind: 'verbal',
      id: asId<'QuestionId'>('u1') as QuestionId,
      templateId: TID,
      categoryId: null,
      text: 'q u1',
      weight: 1,
      order: 0,
      criteria: '',
    };
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [
        { categoryId: UNCATEGORIZED_KEY as CategoryId, enabled: true, count: 1, mode: 'first' },
      ],
      questionsByCategory: { ...buckets, [UNCATEGORIZED_KEY]: [uncatQuestion] },
      runOrder: 'sequential',
    });
    expect(out.answers).toHaveLength(1);
    expect(out.answers[0].questionId).toBe('u1');
    expect(out.answers[0].categoryId).toBeNull();
  });

  it('candidate is copied into the interview (defensive clone)', () => {
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [pick(CAT_A, 1, 'first')],
      questionsByCategory: buckets,
      runOrder: 'sequential',
    });
    expect(out.interview.candidate).toEqual(candidate);
    expect(out.interview.candidate).not.toBe(candidate);
  });

  it('coding question snapshots title/description/language/starterCode onto Answer', () => {
    const codingQ: Question = {
      kind: 'coding',
      id: asId<'QuestionId'>('cq1') as QuestionId,
      templateId: TID,
      categoryId: CAT_A,
      title: 'LRU cache',
      description: 'Реализуйте LRU-кэш с O(1) get/put.',
      language: 'typescript',
      starterCode: 'class LRU {}',
      weight: 3,
      order: 0,
      criteria: 'Проверить понимание hash + linked list',
    };
    const out = buildNewInterviewAggregate({
      templateId: TID,
      candidate,
      picks: [pick(CAT_A, 1, 'first')],
      questionsByCategory: { [CAT_A]: [codingQ] },
      runOrder: 'sequential',
    });

    expect(out.answers).toHaveLength(1);
    const a = out.answers[0];
    expect(a.questionKind).toBe('coding');
    if (a.questionKind !== 'coding') throw new Error('expected coding');
    // For coding answers, questionText carries the task title (the prompt).
    expect(a.questionText).toBe('LRU cache');
    expect(a.questionDescription).toBe('Реализуйте LRU-кэш с O(1) get/put.');
    expect(a.questionLanguage).toBe('typescript');
    expect(a.questionStarterCode).toBe('class LRU {}');
    // code is pre-populated with the starter so the candidate sees boilerplate.
    expect(a.code).toBe('class LRU {}');
    expect(a.questionWeight).toBe(3);
    expect(a.questionCriteria).toBe('Проверить понимание hash + linked list');
  });
});

import { newId, sample, shuffle } from '../../../../../../shared/utils';
import {
  Question,
  TemplateId,
} from '../../../../../templates/interfaces/template';
import {
  Answer,
  CandidateInfo,
  Interview,
  InterviewAggregate,
} from '../../../../interfaces/interview';
import { CategoryPick, RunOrder } from '../state/new-interview.store';

export interface BuildInterviewInput {
  readonly templateId: TemplateId;
  readonly candidate: CandidateInfo;
  readonly picks: readonly CategoryPick[];
  readonly questionsByCategory: Readonly<Record<string, readonly Question[]>>;
  readonly runOrder: RunOrder;
}

/**
 * Build a fresh InterviewAggregate from the new-interview setup state.
 * Pure function — no DI, no store reads. Caller passes a snapshot of
 * everything needed: picks (with order + quota + mode), the precomputed
 * questions bucket, and the run-order toggle.
 */
export const buildNewInterviewAggregate = (input: BuildInterviewInput): InterviewAggregate => {
  const sampled = selectQuestions(input.picks, input.questionsByCategory);
  const ordered = input.runOrder === 'shuffled' ? shuffle(sampled) : sampled;
  const now = new Date().toISOString();
  const interviewId = newId<'InterviewId'>();
  const interview: Interview = {
    id: interviewId,
    templateId: input.templateId,
    status: 'in-progress',
    candidate: { ...input.candidate },
    durationMin: 0,
    notes: '',
    rev: 1,
    answersCount: ordered.length,
    answeredCount: 0,
    skippedCount: 0,
    avg: 0,
    createdAt: now,
    updatedAt: now,
  };
  const answers: readonly Answer[] = ordered.map((q, index) => ({
    id: newId<'AnswerId'>(),
    interviewId,
    questionId: q.id,
    categoryId: q.categoryId,
    questionText: q.text,
    questionWeight: q.weight,
    questionCriteria: q.criteria,
    score: null,
    comment: '',
    skipped: false,
    order: index,
  }));
  return { interview, answers };
};

const selectQuestions = (
  picks: readonly CategoryPick[],
  questionsByCategory: Readonly<Record<string, readonly Question[]>>,
): readonly Question[] => {
  const out: Question[] = [];
  for (const pick of picks) {
    if (!pick.enabled) continue;
    const fromBucket = sortedByOrder(questionsByCategory[pick.categoryId] ?? []);
    out.push(...takeForPick(fromBucket, pick));
  }
  return out;
};

const sortedByOrder = (qs: readonly Question[]): readonly Question[] =>
  qs.slice().sort((a, b) => a.order - b.order);

const takeForPick = (
  qs: readonly Question[],
  pick: CategoryPick,
): readonly Question[] => {
  const n = Math.min(pick.count, qs.length);
  if (n === 0) return [];
  return pick.mode === 'first' ? qs.slice(0, n) : sample(qs, n);
};

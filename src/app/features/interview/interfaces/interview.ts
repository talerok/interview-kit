import { Branded } from '../../../shared/utils';
import { CategoryId, QuestionId, TemplateId } from '../../templates/interfaces/template';

export type InterviewId = Branded<string, 'InterviewId'>;
export type AnswerId = Branded<string, 'AnswerId'>;

export type AnswerScore = 1 | 2 | 3 | 4 | 5;
export type InterviewStatus = 'in-progress' | 'completed' | 'cancelled';

export interface CandidateInfo {
  readonly name: string;
  readonly position: string;
  readonly date: string;
}

export interface Interview {
  readonly id: InterviewId;
  readonly templateId: TemplateId;
  readonly status: InterviewStatus;
  readonly candidate: CandidateInfo;
  readonly durationMin: number;
  readonly notes: string;
  readonly rev: number;
  readonly answersCount: number;
  readonly answeredCount: number;
  readonly skippedCount: number;
  readonly avg: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Answer {
  readonly id: AnswerId;
  readonly interviewId: InterviewId;
  readonly questionId: QuestionId;
  readonly categoryId: CategoryId | null;
  readonly questionText: string;
  readonly questionWeight: 1 | 2 | 3;
  /** Snapshot of the question's interviewer-only hint. Empty when no criteria were set. */
  readonly questionCriteria: string;
  readonly score: AnswerScore | null;
  readonly comment: string;
  readonly skipped: boolean;
  readonly order: number;
}

export interface InterviewAggregate {
  readonly interview: Interview;
  readonly answers: readonly Answer[];
}

export interface StartInterviewInput {
  readonly templateId: TemplateId;
  readonly candidate: CandidateInfo;
  readonly questionCount: number;
  readonly activeCategoryIds: readonly CategoryId[] | null;
}

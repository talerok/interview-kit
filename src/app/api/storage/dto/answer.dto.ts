export type AnswerScore = 1 | 2 | 3 | 4 | 5;

export interface AnswerDto {
  readonly id: string;
  readonly interviewId: string;
  readonly questionId: string;
  readonly categoryId: string | null;
  readonly questionText: string;
  readonly questionWeight: 1 | 2 | 3;
  /** Optional on read for backward-compat with rows written before this field existed. */
  readonly questionCriteria?: string;
  readonly score: AnswerScore | null;
  readonly comment: string;
  readonly skipped: boolean;
  readonly order: number;
}

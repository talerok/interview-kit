import { CodeLanguageDto, QuestionKindDto } from './question.dto';

export type AnswerScore = 1 | 2 | 3 | 4 | 5;

export interface AnswerDto {
  readonly id: string;
  readonly interviewId: string;
  readonly questionId: string;
  readonly categoryId: string | null;
  /** Legacy rows had no kind field; mapper defaults missing values to 'verbal'. */
  readonly questionKind?: QuestionKindDto;
  readonly questionText: string;
  readonly questionWeight: 1 | 2 | 3;
  readonly questionCriteria?: string;
  // Coding-only snapshots:
  readonly questionDescription?: string;
  readonly questionLanguage?: CodeLanguageDto;
  readonly questionStarterCode?: string;
  readonly score: AnswerScore | null;
  readonly comment: string;
  readonly skipped: boolean;
  readonly order: number;
  readonly code?: string;
}

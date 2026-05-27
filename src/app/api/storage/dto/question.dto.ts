export type QuestionWeight = 1 | 2 | 3;
export type QuestionKindDto = 'verbal' | 'coding';
export type CodeLanguageDto =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'sql'
  | 'go'
  | 'java'
  | 'plain';

/**
 * Flat DTO for both kinds — `kind` discriminates between verbal/coding payloads.
 * Legacy rows (written before `kind` existed) have `kind === undefined` and are
 * read as verbal.
 */
export interface QuestionDto {
  readonly id: string;
  readonly templateId: string;
  readonly categoryId: string | null;
  readonly weight: QuestionWeight;
  readonly order: number;
  readonly criteria?: string;
  readonly kind?: QuestionKindDto;
  // verbal
  readonly text?: string;
  // coding
  readonly title?: string;
  readonly description?: string;
  readonly language?: CodeLanguageDto;
  readonly starterCode?: string;
}

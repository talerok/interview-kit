export type QuestionWeight = 1 | 2 | 3;

export interface QuestionDto {
  readonly id: string;
  readonly templateId: string;
  readonly categoryId: string | null;
  readonly text: string;
  readonly weight: QuestionWeight;
  readonly order: number;
  /** Optional on read for backward-compat with rows written before this field existed. */
  readonly criteria?: string;
}

export type QuestionWeight = 1 | 2 | 3;

export interface QuestionDto {
  readonly id: string;
  readonly templateId: string;
  readonly categoryId: string | null;
  readonly text: string;
  readonly weight: QuestionWeight;
  readonly order: number;
}

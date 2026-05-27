import { Branded } from '../../../shared/utils';

export type TemplateId = Branded<string, 'TemplateId'>;
export type CategoryId = Branded<string, 'CategoryId'>;
export type QuestionId = Branded<string, 'QuestionId'>;

export type QuestionWeight = 1 | 2 | 3;
export type QuestionKind = 'verbal' | 'coding';
export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'sql'
  | 'go'
  | 'java'
  | 'plain';

export interface Category {
  readonly id: CategoryId;
  readonly templateId: TemplateId;
  readonly label: string;
  readonly color: string;
  readonly order: number;
}

/** Fields shared by every question kind. */
interface BaseQuestion {
  readonly id: QuestionId;
  readonly templateId: TemplateId;
  readonly categoryId: CategoryId | null;
  readonly weight: QuestionWeight;
  readonly order: number;
  /** Free-text guidance shown to the interviewer during the run. Not surfaced in results. */
  readonly criteria: string;
}

export interface VerbalQuestion extends BaseQuestion {
  readonly kind: 'verbal';
  readonly text: string;
}

export interface CodingQuestion extends BaseQuestion {
  readonly kind: 'coding';
  readonly title: string;
  readonly description: string;
  readonly language: CodeLanguage;
  readonly starterCode: string;
}

export type Question = VerbalQuestion | CodingQuestion;

export interface Template {
  readonly id: TemplateId;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly rev: number;
  readonly categoryCount: number;
  readonly questionCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TemplateAggregate {
  readonly template: Template;
  readonly categories: readonly Category[];
  readonly questions: readonly Question[];
}

export interface CreateTemplateInput {
  readonly name: string;
  readonly description: string;
  readonly categoryPreset: 'none' | 'tech' | 'product' | 'systemdesign';
}

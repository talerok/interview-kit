import { Branded } from '../../../shared/utils';

export type TemplateId = Branded<string, 'TemplateId'>;
export type CategoryId = Branded<string, 'CategoryId'>;
export type QuestionId = Branded<string, 'QuestionId'>;

export type QuestionWeight = 1 | 2 | 3;

export interface Category {
  readonly id: CategoryId;
  readonly templateId: TemplateId;
  readonly label: string;
  readonly color: string;
  readonly order: number;
}

export interface Question {
  readonly id: QuestionId;
  readonly templateId: TemplateId;
  readonly categoryId: CategoryId | null;
  readonly text: string;
  readonly weight: QuestionWeight;
  readonly order: number;
  /** Free-text guidance shown to the interviewer during the run. Not surfaced in results. */
  readonly criteria: string;
}

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

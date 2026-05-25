import {
  AnswerDto,
  CategoryDto,
  InterviewDto,
  QuestionDto,
  TemplateDto,
} from '../storage/dto';

export const AGGREGATE_SCHEMA_VERSION = 1;

export interface TemplateAggregateDto {
  readonly schemaVersion: number;
  readonly template: TemplateDto;
  readonly categories: readonly CategoryDto[];
  readonly questions: readonly QuestionDto[];
}

export interface InterviewAggregateDto {
  readonly schemaVersion: number;
  readonly interview: InterviewDto;
  readonly answers: readonly AnswerDto[];
}

export type CloudAggregateDto = TemplateAggregateDto | InterviewAggregateDto;

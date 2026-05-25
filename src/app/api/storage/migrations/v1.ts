import { MigrationFn } from 'idxdb-utils';
import { INDEXES, STORES } from '../schema';
import {
  AnswerDto,
  CategoryDto,
  InterviewDto,
  MetaEntryDto,
  QuestionDto,
  TemplateDto,
} from '../dto';

export const v1Migration: MigrationFn = ({ db }) => {
  db.createObjectStore<TemplateDto>(STORES.templates, { keyPath: 'id' });

  const categories = db.createObjectStore<CategoryDto>(STORES.categories, { keyPath: 'id' });
  categories.createIndex(INDEXES.categories.byTemplate, 'templateId');

  const questions = db.createObjectStore<QuestionDto>(STORES.questions, { keyPath: 'id' });
  questions.createIndex(INDEXES.questions.byTemplate, 'templateId');
  questions.createIndex(INDEXES.questions.byCategory, 'categoryId');

  const interviews = db.createObjectStore<InterviewDto>(STORES.interviews, { keyPath: 'id' });
  interviews.createIndex(INDEXES.interviews.byTemplate, 'templateId');
  interviews.createIndex(INDEXES.interviews.byStatus, 'status');
  interviews.createIndex(INDEXES.interviews.byDate, 'candidateDate');

  const answers = db.createObjectStore<AnswerDto>(STORES.answers, { keyPath: 'id' });
  answers.createIndex(INDEXES.answers.byInterview, 'interviewId');

  db.createObjectStore<MetaEntryDto>(STORES.meta, { keyPath: 'key' });
};

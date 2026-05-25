export const STORES = {
  templates: 'templates',
  categories: 'categories',
  questions: 'questions',
  interviews: 'interviews',
  answers: 'answers',
  meta: 'meta',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export const INDEXES = {
  categories: { byTemplate: 'by-template' },
  questions: { byTemplate: 'by-template', byCategory: 'by-category' },
  interviews: { byTemplate: 'by-template', byStatus: 'by-status', byDate: 'by-date' },
  answers: { byInterview: 'by-interview' },
} as const;

export const DB_NAME = 'interviewkit';
export const DB_VERSION = 1;

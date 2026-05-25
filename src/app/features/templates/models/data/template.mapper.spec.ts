import { describe, expect, it } from 'vitest';
import {
  CategoryDto,
  QuestionDto,
  TemplateDto,
} from '../../../../api/storage';
import {
  toCategory,
  toCategoryDto,
  toQuestion,
  toQuestionDto,
  toTemplate,
  toTemplateDto,
} from './template.mapper';

const TEMPLATE_DTO: TemplateDto = {
  id: 't1',
  code: 'TPL_BACKEND',
  name: 'Backend Senior',
  description: 'Algorithms + system design',
  color: '#3b82f6',
  rev: 4,
  categoryCount: 2,
  questionCount: 12,
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-25T10:00:00.000Z',
};

const CATEGORY_DTO: CategoryDto = {
  id: 'c1',
  templateId: 't1',
  label: 'Алгоритмы',
  color: '#3b82f6',
  order: 0,
};

const QUESTION_DTO: QuestionDto = {
  id: 'q1',
  templateId: 't1',
  categoryId: 'c1',
  text: 'Объясните сложность quicksort',
  weight: 2,
  order: 3,
};

describe('template.mapper', () => {
  describe('Template', () => {
    it('round-trips Template ↔ TemplateDto', () => {
      const domain = toTemplate(TEMPLATE_DTO);
      expect(toTemplateDto(domain)).toEqual(TEMPLATE_DTO);
    });

    it('defaults missing counts to 0', () => {
      const partial: TemplateDto = {
        ...TEMPLATE_DTO,
        categoryCount: undefined as unknown as number,
        questionCount: undefined as unknown as number,
      };
      const domain = toTemplate(partial);
      expect(domain.categoryCount).toBe(0);
      expect(domain.questionCount).toBe(0);
    });
  });

  describe('Category', () => {
    it('round-trips Category ↔ CategoryDto', () => {
      const domain = toCategory(CATEGORY_DTO);
      expect(toCategoryDto(domain)).toEqual(CATEGORY_DTO);
    });
  });

  describe('Question', () => {
    it('round-trips Question ↔ QuestionDto with categoryId', () => {
      const domain = toQuestion(QUESTION_DTO);
      expect(toQuestionDto(domain)).toEqual(QUESTION_DTO);
    });

    it('preserves null categoryId (uncategorized questions)', () => {
      const dto: QuestionDto = { ...QUESTION_DTO, categoryId: null };
      const domain = toQuestion(dto);
      expect(domain.categoryId).toBeNull();
      expect(toQuestionDto(domain).categoryId).toBeNull();
    });
  });
});

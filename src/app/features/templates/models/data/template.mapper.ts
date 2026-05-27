import { CategoryDto, QuestionDto, TemplateDto } from '../../../../api/storage';
import { asId } from '../../../../shared/utils';
import { Category, CategoryId, Question, QuestionId, Template, TemplateId } from '../../interfaces/template';

export const toTemplate = (dto: TemplateDto): Template => ({
  id: asId<'TemplateId'>(dto.id),
  code: dto.code,
  name: dto.name,
  description: dto.description,
  color: dto.color,
  rev: dto.rev,
  categoryCount: dto.categoryCount ?? 0,
  questionCount: dto.questionCount ?? 0,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

export const toTemplateDto = (model: Template): TemplateDto => ({
  id: model.id,
  code: model.code,
  name: model.name,
  description: model.description,
  color: model.color,
  rev: model.rev,
  categoryCount: model.categoryCount,
  questionCount: model.questionCount,
  createdAt: model.createdAt,
  updatedAt: model.updatedAt,
});

export const toCategory = (dto: CategoryDto): Category => ({
  id: asId<'CategoryId'>(dto.id),
  templateId: asId<'TemplateId'>(dto.templateId),
  label: dto.label,
  color: dto.color,
  order: dto.order,
});

export const toCategoryDto = (model: Category): CategoryDto => ({
  id: model.id,
  templateId: model.templateId,
  label: model.label,
  color: model.color,
  order: model.order,
});

export const toQuestion = (dto: QuestionDto): Question => ({
  id: asId<'QuestionId'>(dto.id),
  templateId: asId<'TemplateId'>(dto.templateId),
  categoryId: dto.categoryId === null ? null : asId<'CategoryId'>(dto.categoryId),
  text: dto.text,
  weight: dto.weight,
  order: dto.order,
  criteria: dto.criteria ?? '',
});

export const toQuestionDto = (model: Question): QuestionDto => ({
  id: model.id,
  templateId: model.templateId,
  categoryId: model.categoryId,
  text: model.text,
  weight: model.weight,
  order: model.order,
  criteria: model.criteria,
});

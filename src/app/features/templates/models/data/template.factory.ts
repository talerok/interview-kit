import { colorFromName, newId } from '../../../../shared/utils';
import {
  CATEGORY_PRESETS,
  deriveTemplateCode,
} from '../../constants/template-presets.const';
import {
  Category,
  CreateTemplateInput,
  Question,
  Template,
  TemplateAggregate,
} from '../../interfaces/template';

/**
 * Build a fresh template aggregate from a create-dialog input. Picks the
 * matching category preset, generates IDs and timestamps, derives the
 * two-letter code, and stamps deterministic colors from the labels.
 *
 * Pure function — no DI, fully testable.
 */
export const buildNewTemplateAggregate = (input: CreateTemplateInput): TemplateAggregate => {
  const now = new Date().toISOString();
  const templateId = newId<'TemplateId'>();
  const preset = CATEGORY_PRESETS.find((p) => p.key === input.categoryPreset);
  const categories: readonly Category[] = (preset?.categories ?? []).map((seed, i) => ({
    id: newId<'CategoryId'>(),
    templateId,
    label: seed.label,
    color: colorFromName(seed.label),
    order: i,
  }));
  const questions: readonly Question[] = [];
  const name = input.name.trim();
  const template: Template = {
    id: templateId,
    code: deriveTemplateCode(name),
    name,
    description: input.description.trim(),
    color: colorFromName(name),
    rev: 1,
    categoryCount: categories.length,
    questionCount: questions.length,
    createdAt: now,
    updatedAt: now,
  };
  return { template, categories, questions };
};

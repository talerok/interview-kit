import {
  Category,
  CategoryId,
  Question,
  TemplateAggregate,
  TemplateId,
} from '../../../../../templates/interfaces/template';
import type {
  CategoryPick,
  PickRow,
  QuestionsByCategory,
} from '../state/new-interview.store';

/**
 * Sentinel "categoryId" for questions whose `Question.categoryId` is null.
 * Lets pick rows treat uncategorized questions like any other category.
 */
export const UNCATEGORIZED_KEY = 'uncategorized' as const;

const UNCATEGORIZED_CATEGORY: Category = {
  id: UNCATEGORIZED_KEY as CategoryId,
  templateId: '' as TemplateId,
  label: 'Без категории',
  color: 'var(--fg-faint)',
  order: Number.MAX_SAFE_INTEGER,
};

const DEFAULT_PER_CATEGORY = 4;

export const groupQuestionsByCategory = (
  questions: readonly Question[],
): QuestionsByCategory => {
  const out: Record<string, Question[]> = {};
  for (const q of questions) {
    const key = q.categoryId ?? UNCATEGORIZED_KEY;
    (out[key] ??= []).push(q);
  }
  return out;
};

export const indexCategories = (
  categories: readonly Category[],
): Record<string, Category> => {
  const out: Record<string, Category> = {};
  for (const c of categories) out[c.id] = c;
  return out;
};

/**
 * Initial pick set for a freshly loaded template — default `DEFAULT_PER_CATEGORY`
 * per category, all enabled, random mode. Appends an extra row for uncategorized
 * questions when the template has any.
 */
export const seedPicks = (aggregate: TemplateAggregate): readonly CategoryPick[] => {
  const sorted = aggregate.categories.slice().sort((a, b) => a.order - b.order);
  const buckets = groupQuestionsByCategory(aggregate.questions);
  const picks: CategoryPick[] = sorted.map((c) => ({
    categoryId: c.id,
    enabled: true,
    count: Math.min(DEFAULT_PER_CATEGORY, buckets[c.id]?.length ?? 0),
    mode: 'random',
  }));
  const uncategorizedCount = buckets[UNCATEGORIZED_KEY]?.length ?? 0;
  if (uncategorizedCount > 0) {
    picks.push({
      categoryId: UNCATEGORIZED_KEY as CategoryId,
      enabled: true,
      count: Math.min(DEFAULT_PER_CATEGORY, uncategorizedCount),
      mode: 'random',
    });
  }
  return picks;
};

/** Pure join of picks + categories + question counts into render-ready rows. */
export const buildPickRows = (
  picks: readonly CategoryPick[],
  categoriesById: Record<string, Category>,
  buckets: QuestionsByCategory,
): readonly PickRow[] => {
  const rows: PickRow[] = [];
  for (const pick of picks) {
    const category =
      pick.categoryId === UNCATEGORIZED_KEY
        ? UNCATEGORIZED_CATEGORY
        : categoriesById[pick.categoryId];
    if (category === undefined) continue;
    const available = buckets[pick.categoryId]?.length ?? 0;
    const effective = pick.enabled ? Math.min(pick.count, available) : 0;
    rows.push({ pick, category, available, effective });
  }
  return rows;
};

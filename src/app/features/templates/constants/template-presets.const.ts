export interface CategoryPresetSeed {
  readonly key: string;
  readonly label: string;
}

export interface CategoryPreset {
  readonly key: 'none' | 'tech' | 'product' | 'systemdesign';
  readonly label: string;
  readonly description: string;
  readonly categories: readonly CategoryPresetSeed[];
}

export const CATEGORY_PRESETS: readonly CategoryPreset[] = [
  {
    key: 'none',
    label: 'Без категорий',
    description: 'Чистый шаблон. Категории добавите позже.',
    categories: [],
  },
  {
    key: 'tech',
    label: 'Технический',
    description: 'Язык · Архитектура · Алгоритмы · Софт-скиллы',
    categories: [
      { key: 'language', label: 'Язык' },
      { key: 'arch', label: 'Архитектура' },
      { key: 'algo', label: 'Алгоритмы' },
      { key: 'behavior', label: 'Софт-скиллы' },
    ],
  },
  {
    key: 'product',
    label: 'Продуктовый',
    description: 'Продукт · Процессы · Софт-скиллы',
    categories: [
      { key: 'product', label: 'Продукт' },
      { key: 'process', label: 'Процессы' },
      { key: 'behavior', label: 'Софт-скиллы' },
    ],
  },
  {
    key: 'systemdesign',
    label: 'System Design',
    description: 'Архитектура · Данные · Trade-offs',
    categories: [
      { key: 'systemdesign', label: 'Архитектура' },
      { key: 'data', label: 'Данные' },
      { key: 'arch', label: 'Trade-offs' },
    ],
  },
] as const;

export const deriveTemplateCode = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '··';
  if (words.length === 1) {
    const w = words[0];
    return (w.length >= 2 ? w.slice(0, 2) : w).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

export type RuPluralForms = readonly [one: string, few: string, many: string];

export const pluralRu = (n: number, forms: RuPluralForms): string => {
  const abs = Math.abs(n) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (tail > 1 && tail < 5) return forms[1];
  if (tail === 1) return forms[0];
  return forms[2];
};

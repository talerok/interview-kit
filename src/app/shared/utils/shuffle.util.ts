export const shuffle = <T>(items: readonly T[]): readonly T[] => {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const sample = <T>(items: readonly T[], n: number): readonly T[] =>
  shuffle(items).slice(0, Math.max(0, Math.min(n, items.length)));

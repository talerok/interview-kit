// Deterministic name → oklch color. Same name always produces the same color,
// hues spread across the wheel via a djb2 hash. Lightness/chroma are fixed
// to keep the palette visually consistent across templates and categories.

const LIGHTNESS = 0.55;
const CHROMA = 0.16;
const FALLBACK_HUE = 264;

const hashHue = (input: string): number => {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
};

export const colorFromName = (name: string): string => {
  const key = name.trim().toLowerCase();
  const hue = key.length === 0 ? FALLBACK_HUE : hashHue(key);
  return `oklch(${LIGHTNESS} ${CHROMA} ${hue})`;
};

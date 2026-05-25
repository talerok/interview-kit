export interface MetaEntryDto<T = unknown> {
  readonly key: string;
  readonly value: T;
}

export const META_KEYS = {
  fileVersion: 'fileVersion',
  cloud: 'cloud',
  theme: 'theme',
} as const;

export type MetaKey = (typeof META_KEYS)[keyof typeof META_KEYS];

const MAX_INITIALS = 2;

export const initialsOf = (fullName: string): string =>
  fullName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, MAX_INITIALS)
    .join('')
    .toUpperCase();

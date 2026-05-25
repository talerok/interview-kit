const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DATETIME_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const fmtDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? String(value) : DATE_FMT.format(date);
};

export const fmtDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? String(value) : DATETIME_FMT.format(date);
};

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

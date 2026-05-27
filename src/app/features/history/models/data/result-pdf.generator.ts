import { Injectable } from '@angular/core';
import { fmtDate, scoreBandLabel } from '../../../../shared/utils';
import { Answer, Interview } from '../../../interview/interfaces/interview';
import { Category, CategoryId, Template } from '../../../templates/interfaces/template';
import { CategoryAverage } from '../state/result.store';

export interface ResultPdfInput {
  readonly interview: Interview;
  readonly template: Template | null;
  readonly categories: readonly Category[];
  readonly answers: readonly Answer[];
  readonly avg: number;
  readonly distribution: readonly number[];
  readonly answeredCount: number;
  readonly skippedCount: number;
  readonly categoryAverages: readonly CategoryAverage[];
}

@Injectable({ providedIn: 'root' })
export class ResultPdfGenerator {
  async download(input: ResultPdfInput): Promise<void> {
    const [pdfMakeMod, vfsMod] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);
    const pdfMake = pdfMakeMod.default;
    pdfMake.addVirtualFileSystem?.(vfsMod.default);
    await new Promise<void>((resolve) => {
      pdfMake.createPdf(buildDoc(input)).download(filenameOf(input.interview), () => resolve());
    });
  }
}

// ───── tokens ─────────────────────────────────────────────────────────────

const COLOR = {
  fg: '#13212e',
  fgStrong: '#0c1a25',
  fgMuted: '#5b6772',
  fgSubtle: '#8a939c',
  border: '#eaedf0',
  trackBg: '#eef1f4',
} as const;

const SCORE_HEX: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#bf4a43',
  2: '#c9783a',
  3: '#b9913a',
  4: '#6f9740',
  5: '#43815a',
};

const PAGE_MARGIN = 40;
const PAGE_USABLE_W = 515;
const BAR_H = 8;
const BAR_R = 2;
const BAR_OFFSET_Y = 4;

// pdfmake margin convention: [left, top, right, bottom].
const mb = (b: number) => [0, 0, 0, b];
const mt = (t: number) => [0, t, 0, 0];

// ───── utilities ──────────────────────────────────────────────────────────

const _hexCanvas = document.createElement('canvas');
_hexCanvas.width = _hexCanvas.height = 1;
const _hexCtx = _hexCanvas.getContext('2d', { willReadFrequently: true })!;

/** Any CSS color (oklch, hsl, hex, …) → sRGB hex, via the browser canvas. */
const cssColorToHex = (css: string): string => {
  _hexCtx.clearRect(0, 0, 1, 1);
  _hexCtx.fillStyle = '#000';
  _hexCtx.fillStyle = css;
  _hexCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = _hexCtx.getImageData(0, 0, 1, 1).data;
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

const bandHexOf = (avg: number): string => {
  const rounded = Math.max(1, Math.min(5, Math.round(avg) || 1)) as 1 | 2 | 3 | 4 | 5;
  return SCORE_HEX[rounded];
};

const filenameOf = (interview: Interview): string => {
  const name = interview.candidate.name.trim().replace(/[<>:"/\\|?*]/g, '');
  const date = interview.candidate.date.slice(0, 10);
  return `${[name, date].filter((p) => p.length > 0).join(' — ') || 'interview'}.pdf`;
};

// ───── shared layouts & primitives ────────────────────────────────────────

const BAR_TABLE_LAYOUT = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingTop: () => 3,
  paddingBottom: () => 3,
  paddingLeft: () => 0,
  paddingRight: () => 0,
};

const ANSWERS_LAYOUT = {
  hLineWidth: (i: number, n: { table: { body: unknown[] } }) =>
    i === 0 || i === n.table.body.length ? 0 : 0.5,
  vLineWidth: () => 0,
  hLineColor: () => COLOR.border,
  paddingTop: () => 10,
  paddingBottom: () => 10,
  paddingLeft: () => 0,
  paddingRight: () => 0,
};

/** Track + colored fill. y offset matches the baseline of the row's text cells. */
const barCell = (width: number, percent: number, color: string) => ({
  canvas: [
    { type: 'rect', x: 0, y: BAR_OFFSET_Y, w: width, h: BAR_H, color: COLOR.trackBg, r: BAR_R },
    ...(percent > 0
      ? [{ type: 'rect', x: 0, y: BAR_OFFSET_Y, w: width * percent, h: BAR_H, color, r: BAR_R }]
      : []),
  ],
});

const sectionTitle = (label: string) => ({
  text: label,
  fontSize: 12,
  bold: true,
  color: COLOR.fgStrong,
  margin: mb(8),
});

// ───── document ───────────────────────────────────────────────────────────

const buildDoc = (input: ResultPdfInput): unknown => {
  const bandColor = bandHexOf(input.avg);
  const categoryById = new Map<CategoryId, Category>(input.categories.map((c) => [c.id, c]));

  return {
    pageSize: 'A4',
    pageMargins: [PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: COLOR.fg, lineHeight: 1.35 },
    content: [
      heading(input.interview, input.template),
      scoreSection(input, bandColor),
      categoriesSection(input.categoryAverages),
      notesSection(input.interview.notes),
      answersSection(input.answers, categoryById),
    ].filter((x) => x !== null),
  };
};

// ───── heading ────────────────────────────────────────────────────────────

const heading = (interview: Interview, template: Template | null) => {
  const subtitle = [
    interview.candidate.position || '—',
    fmtDate(interview.candidate.date),
    `${interview.durationMin} мин`,
    template?.name,
  ]
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .join(' · ');
  return {
    margin: mb(22),
    stack: [
      { text: interview.candidate.name, fontSize: 22, bold: true, color: COLOR.fgStrong },
      { text: subtitle, fontSize: 10, color: COLOR.fgMuted, margin: mt(4) },
    ],
  };
};

// ───── score & distribution ───────────────────────────────────────────────

const scoreSection = (input: ResultPdfInput, bandColor: string) => ({
  margin: mb(24),
  columnGap: 20,
  columns: [heroScoreBlock(input, bandColor), distributionBlock(input.distribution)],
});

const heroScoreBlock = (input: ResultPdfInput, bandColor: string) => ({
  width: 150,
  stack: [
    {
      lineHeight: 1,
      text: [
        { text: input.avg.toFixed(1), fontSize: 44, bold: true, color: bandColor },
        { text: '  / 5', fontSize: 12, color: COLOR.fgSubtle },
      ],
    },
    {
      text: scoreBandLabel(input.avg),
      fontSize: 11,
      bold: true,
      color: bandColor,
      margin: mt(8),
    },
    {
      text: `${input.answeredCount} оценено · ${input.skippedCount} пропущено`,
      fontSize: 9,
      color: COLOR.fgMuted,
      margin: mt(4),
    },
  ],
});

const DIST_BAR_W = 240;

const distributionBlock = (distribution: readonly number[]) => {
  const max = Math.max(1, ...distribution);
  return {
    width: '*',
    table: {
      widths: [14, DIST_BAR_W, 30],
      body: distribution.map((count, i) => distributionRow(i + 1, count, count / max)),
    },
    layout: BAR_TABLE_LAYOUT,
  };
};

const distributionRow = (score: number, count: number, percent: number) => {
  const color = SCORE_HEX[score as 1 | 2 | 3 | 4 | 5];
  return [
    {
      text: String(score),
      fontSize: 9,
      bold: true,
      color,
      alignment: 'right',
      margin: [0, 3, 6, 0],
    },
    barCell(DIST_BAR_W, percent, color),
    {
      text: String(count),
      fontSize: 9,
      color: count > 0 ? COLOR.fg : COLOR.fgSubtle,
      alignment: 'right',
      margin: [6, 3, 0, 0],
    },
  ];
};

// ───── categories profile ─────────────────────────────────────────────────

const CAT_LABEL_W = 130;
const CAT_VALUE_W = 40;
const CAT_GAP = 12;
const CAT_BAR_W = PAGE_USABLE_W - CAT_LABEL_W - CAT_VALUE_W - CAT_GAP;

const categoriesSection = (rows: readonly CategoryAverage[]) => {
  if (rows.length === 0) return null;
  return {
    margin: mb(22),
    stack: [
      sectionTitle('Профиль по категориям'),
      {
        table: { widths: [CAT_LABEL_W, CAT_BAR_W, CAT_VALUE_W], body: rows.map(categoryRow) },
        layout: BAR_TABLE_LAYOUT,
      },
    ],
  };
};

const categoryRow = ({ category, avg, count }: CategoryAverage) => {
  const color = cssColorToHex(category.color);
  const percent = count > 0 ? avg / 5 : 0;
  return [
    {
      fontSize: 10,
      margin: [0, 4, 8, 0],
      text: [
        { text: '● ', color },
        { text: category.label, color: COLOR.fg },
      ],
    },
    barCell(CAT_BAR_W, percent, color),
    {
      text: count > 0 ? avg.toFixed(1) : '—',
      fontSize: 10,
      color: count > 0 ? COLOR.fgStrong : COLOR.fgSubtle,
      bold: count > 0,
      alignment: 'right',
      margin: [8, 4, 0, 0],
    },
  ];
};

// ───── notes ──────────────────────────────────────────────────────────────

const notesSection = (notes: string) => {
  if (notes.trim().length === 0) return null;
  return {
    margin: mb(22),
    stack: [
      sectionTitle('Заметки'),
      { text: notes, fontSize: 10, color: COLOR.fgStrong, lineHeight: 1.45 },
    ],
  };
};

// ───── answers ────────────────────────────────────────────────────────────

const ANS_NUM_W = 24;
const ANS_SCORE_W = 36;
const ANS_MAIN_W = PAGE_USABLE_W - ANS_NUM_W - ANS_SCORE_W;

const answersSection = (
  answers: readonly Answer[],
  categoryById: Map<CategoryId, Category>,
) => {
  if (answers.length === 0) return null;
  return {
    stack: [
      sectionTitle('Ответы'),
      {
        table: {
          widths: [ANS_NUM_W, ANS_MAIN_W, ANS_SCORE_W],
          body: answers.map((a, i) => answerRow(a, i, categoryById)),
        },
        layout: ANSWERS_LAYOUT,
      },
    ],
  };
};

const answerRow = (a: Answer, index: number, categoryById: Map<CategoryId, Category>) => [
  answerIndexCell(index),
  answerBodyCell(a, categoryById),
  answerScoreCell(a),
];

const answerIndexCell = (index: number) => ({
  text: String(index + 1).padStart(2, '0'),
  fontSize: 11,
  bold: true,
  color: COLOR.fgSubtle,
  alignment: 'right',
  margin: [0, 2, 8, 0],
});

const answerBodyCell = (a: Answer, categoryById: Map<CategoryId, Category>) => ({
  stack: [
    { text: a.questionText, fontSize: 11, color: COLOR.fgStrong, lineHeight: 1.4 },
    { text: answerMeta(a, categoryById), fontSize: 8.5, margin: mt(4) },
    ...(a.comment
      ? [{ text: a.comment, fontSize: 9.5, color: COLOR.fgMuted, lineHeight: 1.45, margin: mt(6) }]
      : []),
  ],
});

const answerMeta = (a: Answer, categoryById: Map<CategoryId, Category>) => {
  const cat = a.categoryId !== null ? (categoryById.get(a.categoryId) ?? null) : null;
  const runs: unknown[] = [];
  if (cat !== null) {
    runs.push({ text: cat.label, color: cssColorToHex(cat.color), bold: true });
    runs.push({ text: '  ·  ', color: COLOR.fgSubtle });
  }
  runs.push({ text: `вес ×${a.questionWeight}`, color: COLOR.fgSubtle });
  return runs;
};

const answerScoreCell = (a: Answer) => {
  if (a.skipped) {
    return {
      text: 'пропущ.',
      fontSize: 8,
      color: COLOR.fgSubtle,
      italics: true,
      alignment: 'right',
      margin: mt(6),
    };
  }
  if (a.score === null) {
    return { text: '—', fontSize: 14, color: COLOR.fgSubtle, alignment: 'right', margin: mt(2) };
  }
  return {
    text: String(a.score),
    fontSize: 22,
    bold: true,
    color: SCORE_HEX[a.score],
    alignment: 'right',
    margin: [0, -2, 0, 0],
  };
};

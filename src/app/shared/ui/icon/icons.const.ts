// SVG paths are static, controlled by us — safe to inline via innerHTML in icon.component.
// All icons use 16x16 viewBox unless noted. Strokes/fills use currentColor.

const ICONS = {
  layers:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2 2 5l6 3 6-3-6-3Z"/><path d="m2 8 6 3 6-3"/><path d="m2 11 6 3 6-3"/></svg>',
  plus:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v10M3 8h10"/></svg>',
  play:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v10l9-5-9-5Z"/></svg>',
  history:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4v3h3"/><path d="M3.3 9a5.5 5.5 0 1 0 .8-4.2"/><path d="M8 5v3.5l2.5 1.5"/></svg>',
  settings:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2"/><path d="M13 8a1 1 0 0 1 .7.3l.6.6a1 1 0 0 1 0 1.4l-.6.6a1 1 0 0 1-1.4 0l-.3-.3a4.8 4.8 0 0 1-2 .8l-.1.5a1 1 0 0 1-1 .9h-.8a1 1 0 0 1-1-.9l-.1-.5a4.8 4.8 0 0 1-2-.8l-.3.3a1 1 0 0 1-1.4 0l-.6-.6a1 1 0 0 1 0-1.4l.3-.3a4.8 4.8 0 0 1-.8-2L1.4 8a1 1 0 0 1-.9-1v-.8a1 1 0 0 1 .9-1l.5-.1c.2-.7.4-1.4.8-2l-.3-.3a1 1 0 0 1 0-1.4l.6-.6a1 1 0 0 1 1.4 0l.3.3c.6-.4 1.3-.6 2-.8l.1-.5a1 1 0 0 1 1-.9h.8a1 1 0 0 1 1 .9l.1.5c.7.2 1.4.4 2 .8l.3-.3a1 1 0 0 1 1.4 0l.6.6a1 1 0 0 1 0 1.4l-.3.3c.4.6.6 1.3.8 2l.5.1a1 1 0 0 1 .9 1V7a1 1 0 0 1-.9 1l-.5.1"/></svg>',
  'arrow-right':
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
  'arrow-left':
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8H3M7 4 3 8l4 4"/></svg>',
  'chevron-right':
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg>',
  more:
    '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="12" cy="8" r="1.2"/></svg>',
  search:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4"/><path d="m13 13-3-3"/></svg>',
  drag:
    '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="6" cy="4" r="1"/><circle cx="10" cy="4" r="1"/><circle cx="6" cy="8" r="1"/><circle cx="10" cy="8" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="10" cy="12" r="1"/></svg>',
  trash:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10M6 4V2h4v2M5 4l1 10h4l1-10"/></svg>',
  copy:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>',
  check:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 3.5 3.5L13 5"/></svg>',
  x:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
  skip:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4v8l6-4-6-4ZM13 3v10"/></svg>',
  cloud:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12a3 3 0 0 1-.5-6 4 4 0 0 1 7.5 1.5A2.5 2.5 0 0 1 11 12H5Z"/></svg>',
  download:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v8m0 0-3-3m3 3 3-3M3 13h10"/></svg>',
  upload:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5m0 0L5 8m3-3 3 3M3 3h10"/></svg>',
  edit:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m11 2 3 3-8 8H3v-3l8-8Z"/></svg>',
  bolt:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1 3 9h4l-1 6 6-8H8l1-6Z"/></svg>',
  user:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="6" r="3"/><path d="M3 14a5 5 0 0 1 10 0"/></svg>',
  calendar:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6h12M5 2v2M11 2v2"/></svg>',
  briefcase:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="12" height="9" rx="1.5"/><path d="M6 5V3h4v2M2 9h12"/></svg>',
  shuffle:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3h-2l-7 10H2M13 13h-2l-2-3M2 3h2l2 3M11 1l2 2-2 2M11 11l2 2-2 2"/></svg>',
  question:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M6 6c.5-1.5 3-1.5 3 0 0 1.5-1.5 1.5-1.5 3"/><circle cx="7.5" cy="12" r=".5" fill="currentColor"/></svg>',
  chart:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 14h12M4 11V8M7 11V4M10 11V6M13 11V9"/></svg>',
  filter:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h12l-5 7v4l-2-1v-3L2 3Z"/></svg>',
  refresh:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v3h-3M2 13v-3h3"/><path d="M13 7a5 5 0 0 0-9-2L2 7M3 9a5 5 0 0 0 9 2l2-2"/></svg>',
  link:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4L8 4"/><path d="M9 7a3 3 0 0 0-4 0L3 9a3 3 0 0 0 4 4l1-1"/></svg>',
  weight:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h8l1 9H3l1-9Z"/><circle cx="8" cy="3.5" r="1.5"/></svg>',
  sun:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M3 13l1.5-1.5M11.5 4.5 13 3"/></svg>',
  moon:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 9.5A6 6 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5Z"/></svg>',
  notes:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2h7l3 3v9H3V2Z"/><path d="M10 2v3h3M5 8h6M5 11h4"/></svg>',
  dropbox:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2 0 6l6 4 6-4-6-4Zm12 0-6 4 6 4 6-4-6-4ZM0 14l6 4 6-4-6-4-6 4Zm18-4-6 4 6 4 6-4-6-4ZM6 19l6 4 6-4-6-4-6 4Z"/></svg>',
  yandex:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8 2 4.5 5 4.5 9c0 3.5 3 5.5 4 6.5L12 22l3.5-6.5c1-1 4-3 4-6.5C19.5 5 16 2 12 2Zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg>',
  'check-circle':
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="m5.5 8 2 2 3-4"/></svg>',
} as const;

export type IconName = keyof typeof ICONS;
export { ICONS };

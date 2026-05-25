import type {EventType} from '../../lib/types';

export const STEPS = ['Basics', 'Details', 'Target', 'Review'] as const;
export type CreateEventStep = (typeof STEPS)[number];
export type CreateEventStepIndex = 0 | 1 | 2 | 3;

export const EVENT_TYPES: {value: EventType; label: string}[] = [
  {value: 'road', label: 'Road'},
  {value: 'dirt', label: 'Dirt'},
  {value: 'drift', label: 'Drift'},
  {value: 'touge', label: 'Touge'},
];

export const TITLE_MAX_LENGTH = 100;
export const COVER_MAX_BYTES = 2 * 1024 * 1024;
export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp';

export const formInput =
  'w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:border-white/20 focus:outline-none transition-colors duration-150';

export const formInputError =
  'border-red-500/50 focus:border-red-400/60';

export const formLabel = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5';

export const formHint = 'mt-1.5 text-xs text-muted';

export const formFieldError = 'mt-1.5 text-xs text-red-300/90';

import i18n from '../i18n';
import type {EventType} from './types';

export const EVENT_TYPE_VALUES = [
  'road',
  'dirt',
  'cruise',
] as const satisfies readonly EventType[];

export function isEventType(value: string | undefined | null): value is EventType {
  return !!value && (EVENT_TYPE_VALUES as readonly string[]).includes(value);
}

/** Coerce API/DB values; unknown legacy types fall back to road. */
export function normalizeEventType(value: string | undefined | null): EventType {
  return isEventType(value) ? value : 'road';
}

/** English type label from en.json — used for Discord Rich Presence (always EN). */
export function eventTypeLabelEn(type: EventType): string {
  return i18n.getFixedT('en')(`eventTypes.${normalizeEventType(type)}`);
}

export type EventTypeOption = {
  value: EventType;
  accentBar: string;
  badge: {border: string; text: string; bg: string};
  detailVisual: {gradient: string; glow: string};
  typeButtonSelected: string;
};

/** Labels and accent colors for event types (browse, cards, create form, detail). */
export const EVENT_TYPES: EventTypeOption[] = [
  {
    value: 'road',
    accentBar: 'bg-blue-500/25',
    badge: {
      border: 'border-blue-500/30',
      text: 'text-blue-300',
      bg: 'bg-blue-500/10',
    },
    detailVisual: {
      gradient: 'from-blue-950 via-blue-900/50 to-base',
      glow: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.25) 0%, transparent 70%)',
    },
    typeButtonSelected: 'bg-blue-500/20 text-blue-100 ring-1 ring-blue-500/40',
  },
  {
    value: 'dirt',
    accentBar: 'bg-orange-500/25',
    badge: {
      border: 'border-orange-500/30',
      text: 'text-orange-300',
      bg: 'bg-orange-500/10',
    },
    detailVisual: {
      gradient: 'from-orange-950 via-orange-900/50 to-base',
      glow: 'radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.25) 0%, transparent 70%)',
    },
    typeButtonSelected: 'bg-orange-500/20 text-orange-100 ring-1 ring-orange-500/40',
  },
  {
    value: 'cruise',
    accentBar: 'bg-emerald-500/25',
    badge: {
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      bg: 'bg-emerald-500/10',
    },
    detailVisual: {
      gradient: 'from-emerald-950 via-emerald-900/50 to-base',
      glow: 'radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.25) 0%, transparent 70%)',
    },
    typeButtonSelected: 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500/40',
  },
];

export function eventTypeLabel(type: EventType): string {
  return i18n.t(`eventTypes.${type}`);
}

export function eventTypeMeta(type: EventType): EventTypeOption & {label: string} {
  const meta = EVENT_TYPES.find((t) => t.value === type) ?? EVENT_TYPES[0];
  return {...meta, label: eventTypeLabel(type)};
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  road: 'Road racing',
  dirt: 'Dirt racing',
  cruise: 'Meet & cruise',
};

/** Discord embed color (decimal). */
const EVENT_TYPE_EMBED_COLORS: Record<string, number> = {
  road: 0x3b82f6,
  dirt: 0xf97316,
  cruise: 0x10b981,
};

const VALID_EVENT_TYPES = new Set(Object.keys(EVENT_TYPE_LABELS));

export function isValidEventType(type?: string): boolean {
  return !!type && VALID_EVENT_TYPES.has(type);
}

export function eventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

export function eventTypeEmbedColor(type: string): number {
  return EVENT_TYPE_EMBED_COLORS[type] ?? EVENT_TYPE_EMBED_COLORS.road;
}

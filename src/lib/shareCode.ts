/** Forza share codes: nine digits as `000 000 000`. */
const DIGIT_GROUPS = [3, 3, 3] as const;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

export function formatShareCode(value: string): string {
  const d = digitsOnly(value);
  if (!d) return '';
  let i = 0;
  const parts: string[] = [];
  for (const len of DIGIT_GROUPS) {
    if (i >= d.length) break;
    parts.push(d.slice(i, i + len));
    i += len;
  }
  return parts.join(' ');
}

export function isCompleteShareCode(value: string): boolean {
  return digitsOnly(value).length === 9;
}

export function normalizeShareCode(value: string): string | null {
  const d = digitsOnly(value);
  if (!d) return null;
  return formatShareCode(d);
}

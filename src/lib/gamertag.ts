/** Xbox Live gamertag: 1–15 chars, alphanumeric and spaces */
export const GAMERTAG_RE = /^[a-zA-Z0-9 ]{1,15}$/;

export function hasGamertag(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function isValidGamertag(value: string): boolean {
  return GAMERTAG_RE.test(value.trim());
}

export function gamertagError(value: string): string | null {
  const t = value.trim();
  if (!t) return 'Gamertag is required';
  if (!isValidGamertag(t)) {
    return 'Use 1–15 letters, numbers, or spaces (Xbox Live rules)';
  }
  return null;
}

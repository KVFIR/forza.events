import i18n from '../i18n';

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
  if (!t) return i18n.t('gamertag.required');
  if (!isValidGamertag(t)) {
    return i18n.t('gamertag.invalid');
  }
  return null;
}

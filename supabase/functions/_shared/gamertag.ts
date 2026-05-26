/** Xbox Live gamertag — keep in sync with src/lib/gamertag.ts */
export const GAMERTAG_RE = /^[a-zA-Z0-9 ]{1,15}$/;

export function validateGamertag(value: unknown): {ok: true; gamertag: string} | {ok: false; error: string} {
  if (typeof value !== 'string') {
    return {ok: false, error: 'Gamertag required'};
  }
  const gamertag = value.trim();
  if (!gamertag) {
    return {ok: false, error: 'Gamertag required'};
  }
  if (!GAMERTAG_RE.test(gamertag)) {
    return {ok: false, error: 'Gamertag must be 1–15 alphanumeric characters or spaces'};
  }
  return {ok: true, gamertag};
}

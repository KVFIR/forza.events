/** Cover upload limits (keep in sync with `src/lib/coverImage.ts`). */

/** Max size of the file the user picks before client-side crop/compress. */
export const COVER_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const COVER_SOURCE_MAX_MB = 20;

export function coverSourceLimitErrorEn(): string {
  return `Image exceeds ${COVER_SOURCE_MAX_MB} MB limit`;
}

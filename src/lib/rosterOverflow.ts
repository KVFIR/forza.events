const GAP = 8;
const HIDE_EPS = 1;
/** Extra px before restore so unmounting the item (slot grows) cannot immediately show it again. */
const RESTORE_SLACK = 4;

export type RosterNameSlot = {
  textW: number;
  slotW: number;
  ratingW: number;
};

export function nextHideTrailing(
  hidden: boolean,
  textW: number,
  slotW: number,
  itemW: number,
): boolean {
  if (itemW <= 0) return hidden;
  if (!hidden) return textW > slotW + HIDE_EPS;
  return textW > slotW - itemW - GAP - RESTORE_SLACK;
}

/** Hide every roster ELO together: if any rated card overflows, all hide; restore only when all would fit. */
export function nextSharedHideRating(
  hideRating: boolean,
  cards: RosterNameSlot[],
): boolean {
  const rated = cards.filter((c) => c.ratingW > 0);
  if (rated.length === 0) return hideRating;
  return rated.some((c) => nextHideTrailing(hideRating, c.textW, c.slotW, c.ratingW));
}

import {describe, expect, it} from 'vitest';
import {nextHideTrailing, nextSharedHideRating} from './rosterOverflow';

const fit = {textW: 40, slotW: 80, ratingW: 28};
const overflow = {textW: 90, slotW: 72, ratingW: 28};
const hiddenFits = {textW: 40, slotW: 80, ratingW: 28};
const hiddenStillTight = {textW: 70, slotW: 80, ratingW: 28};

describe('nextHideTrailing', () => {
  it('stays put when item width is unknown', () => {
    expect(nextHideTrailing(false, 90, 40, 0)).toBe(false);
    expect(nextHideTrailing(true, 90, 40, 0)).toBe(true);
  });

  it('hides when the name overflows the live slot', () => {
    expect(nextHideTrailing(false, 73, 71, 28)).toBe(true);
  });

  it('does not restore when the slot only grew by the hidden item plus 1px', () => {
    expect(nextHideTrailing(true, 73, 71 + 28 + 8 + 1, 28)).toBe(true);
  });
});

describe('nextSharedHideRating', () => {
  it('stays visible when nothing is rated', () => {
    expect(nextSharedHideRating(false, [{textW: 90, slotW: 40, ratingW: 0}])).toBe(false);
  });

  it('stays hidden when ratings are gone from the DOM', () => {
    expect(nextSharedHideRating(true, [{textW: 90, slotW: 80, ratingW: 0}])).toBe(true);
  });

  it('hides all when any visible rating overflows', () => {
    expect(nextSharedHideRating(false, [fit, overflow])).toBe(true);
  });

  it('keeps all visible when every rated name fits', () => {
    expect(nextSharedHideRating(false, [fit, fit])).toBe(false);
  });

  it('restores only when every card would still fit with rating shown', () => {
    expect(nextSharedHideRating(true, [hiddenFits, hiddenFits])).toBe(false);
    expect(nextSharedHideRating(true, [hiddenFits, hiddenStillTight])).toBe(true);
  });
});

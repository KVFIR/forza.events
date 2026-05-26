import {useEffect, useRef, useState} from 'react';

/** Wait this long before showing a spinner (skips flash on fast loads). */
export const LOADING_SHOW_DELAY_MS = 400;
/**
 * Minimum spinner time once visible. Set to 0 so data/UI is not held back after fetch completes.
 * Spinner polish only applies when this is > 0.
 */
export const LOADING_MIN_VISIBLE_MS = 0;

export type UseLoadingUIOptions = {
  delay?: number;
  /** Minimum time to keep spinner after load ends (only if spinner was shown). */
  minDuration?: number;
};

/**
 * Controls when loading chrome is visible: delayed show + optional minimum display time.
 * Fast loads (&lt; delay) never show a spinner and release immediately when `loading` is false.
 */
export function useLoadingUI(
  loading: boolean,
  {delay = LOADING_SHOW_DELAY_MS, minDuration = LOADING_MIN_VISIBLE_MS}: UseLoadingUIOptions = {},
): boolean {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const visibleRef = useRef(false);
  visibleRef.current = visible;

  useEffect(() => {
    if (loading) {
      const delayTimer = window.setTimeout(() => {
        setVisible(true);
        shownAtRef.current = Date.now();
      }, delay);
      return () => window.clearTimeout(delayTimer);
    }

    if (!visibleRef.current) {
      return;
    }

    if (minDuration <= 0) {
      setVisible(false);
      shownAtRef.current = null;
      return;
    }

    const shownAt = shownAtRef.current ?? Date.now();
    const remaining = Math.max(0, minDuration - (Date.now() - shownAt));
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      shownAtRef.current = null;
    }, remaining);
    return () => window.clearTimeout(hideTimer);
  }, [loading, delay, minDuration]);

  return visible;
}

import {useCallback, useEffect, useRef} from 'react';

/** Debounced callback; pending invocation runs on unmount so the last signal is not dropped. */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
): T {
  const fnRef = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef(false);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
      if (pendingRef.current) {
        pendingRef.current = false;
        fnRef.current();
      }
    },
    [],
  );

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
      pendingRef.current = true;
      timerRef.current = setTimeout(() => {
        pendingRef.current = false;
        fnRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  ) as T;
}

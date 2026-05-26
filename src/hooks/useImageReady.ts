import {useCallback, useEffect, useRef, useState} from 'react';

/** Tracks whether an image URL has finished loading (or failed). Handles browser cache. */
export function useImageReady(src: string): {
  ready: boolean;
  onLoad: () => void;
  onError: () => void;
  imgRef: (el: HTMLImageElement | null) => void;
} {
  const [ready, setReady] = useState(false);
  const srcRef = useRef(src);
  srcRef.current = src;

  useEffect(() => {
    setReady(false);
  }, [src]);

  const markReady = useCallback(() => {
    if (srcRef.current !== src) return;
    setReady(true);
  }, [src]);

  const imgRef = useCallback(
    (el: HTMLImageElement | null) => {
      if (!el || srcRef.current !== src) return;
      if (el.complete) {
        markReady();
      }
    },
    [src, markReady],
  );

  return {ready, onLoad: markReady, onError: markReady, imgRef};
}

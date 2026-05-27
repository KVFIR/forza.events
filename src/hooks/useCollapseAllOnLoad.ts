import {useCallback, useEffect, useRef, useState} from 'react';

/** Collapse every list card once when edit data loads (`collapseAllKey` = event id). */
export function useCollapseAllOnLoad(collapseAllKey: string | null | undefined) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const appliedForKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!collapseAllKey) appliedForKeyRef.current = null;
  }, [collapseAllKey]);

  const collapseAll = useCallback(
    (ids: string[]) => {
      if (!collapseAllKey || ids.length === 0) return;
      if (appliedForKeyRef.current === collapseAllKey) return;
      appliedForKeyRef.current = collapseAllKey;
      setCollapsedIds(new Set(ids));
    },
    [collapseAllKey],
  );

  return {collapsedIds, setCollapsedIds, collapseAll};
}

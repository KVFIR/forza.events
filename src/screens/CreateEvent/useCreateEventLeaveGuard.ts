import {useCallback} from 'react';
import {useBeforeUnload, useBlocker, type Blocker} from 'react-router';

/** Warn on tab close and in-app navigation when the create form has unsaved edits. */
export function useCreateEventLeaveGuard(when: boolean): Blocker {
  const shouldBlock = useCallback(
    ({currentLocation, nextLocation}: {currentLocation: {pathname: string; search: string}; nextLocation: {pathname: string; search: string}}) => {
      if (!when) return false;
      return (
        currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search
      );
    },
    [when],
  );

  const blocker = useBlocker(shouldBlock);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!when) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [when],
    ),
  );

  return blocker;
}

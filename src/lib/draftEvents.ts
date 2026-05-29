import type {EventLifecycle} from './types';

/** Keep in sync with `supabase/functions/_shared/draftEvents.ts` (`HOST_DRAFT_STATUSES`). */
export const HOST_DRAFT_LIFECYCLE = 'draft' as const satisfies EventLifecycle;

export function isHostDraftLifecycle(lifecycle: EventLifecycle): boolean {
  return lifecycle === HOST_DRAFT_LIFECYCLE;
}

/** Host draft list: unpublished drafts only (not closed lifecycle states). */
export const HOST_DRAFT_STATUSES = ['draft'] as const;

export type HostDraftStatus = (typeof HOST_DRAFT_STATUSES)[number];

export function isHostDraftStatus(status: string): status is HostDraftStatus {
  return (HOST_DRAFT_STATUSES as readonly string[]).includes(status);
}

/** PostgREST `.in('status', …)` value for host draft listings. */
export function hostDraftStatusFilter(): HostDraftStatus[] {
  return [...HOST_DRAFT_STATUSES];
}

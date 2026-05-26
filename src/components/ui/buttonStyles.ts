/** Shared button / modal tokens — keep UI actions consistent across screens. */

export const buttonBaseClass =
  'inline-flex items-center justify-center gap-2 transition-all duration-200';

export type ButtonSize = 'default' | 'compact' | 'toolbar' | 'chip' | 'icon';

export const buttonSizeClass: Record<ButtonSize, string> = {
  default: 'rounded-lg px-4 py-2.5 text-sm',
  compact: 'rounded-lg px-6 py-2.5 text-xs shadow-none',
  toolbar: 'rounded-lg h-9 px-3 text-xs',
  chip: 'rounded-md px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest',
  icon: 'rounded-lg p-2',
};

export const modalOverlayClass =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm';

export const modalPanelClass =
  'w-full max-w-sm rounded-2xl border border-white/[0.1] bg-card p-5 shadow-xl';

export const segmentContainerClass =
  'rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5';

export const segmentItemBaseClass =
  'rounded-md font-semibold transition-colors duration-150';

export const segmentItemIdleClass = 'text-muted hover:text-slate-300';

export const segmentItemSelectedClass = 'bg-white/[0.1] text-white';

export const templateChipClass =
  'rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-muted transition-colors hover:border-accent-purple/30 hover:text-slate-300';

/** Busy / loading labels for disabled primary actions (i18n-ready strings). */
export const BUSY_LABEL = {
  working: 'Working…',
  saving: 'Saving…',
  deleting: 'Deleting…',
  cancelling: 'Cancelling…',
  publishing: 'Publishing…',
  signingIn: 'Signing in…',
} as const;

/** Shared form, surface, and brand tokens — keep inputs and layout consistent. */

import {cn} from '../../lib/cn';

export const fieldLabelClass =
  'block text-[10px] font-bold uppercase tracking-[0.14em] text-muted';

/** Compact caps label inside cards/detail rows (not form section titles). */
export const sectionLabelClass =
  'text-[10px] font-bold uppercase tracking-widest text-muted';

/** Create/edit form block heading — distinct from `fieldLabelClass`. */
export const formSectionTitleClass =
  'text-sm font-semibold tracking-tight text-slate-100';

/** Border-only panels for create/edit form sections (no fill). */
export const formSectionPanelClass =
  'rounded-xl border border-white/[0.1]';

export const fieldHintClass = 'mt-1.5 text-xs text-muted';

export const fieldErrorClass = 'mt-1.5 text-xs text-red-300/90';

export const controlClass =
  'w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white [color-scheme:dark] transition-colors duration-150';

export const controlFocusClass = 'focus:border-white/20 focus:outline-none';

export const controlPlaceholderClass = 'placeholder:text-muted';

export const controlInvalidClass = 'border-red-500/50 focus:border-red-400/60';

/** Full-width text inputs and textareas in forms. */
export const inputClass = [
  controlClass,
  controlFocusClass,
  controlPlaceholderClass,
  /** Flex/grid shrink; pair with `index.css` WebKit rules for native date/time pickers. */
  'min-w-0 max-w-full',
].join(' ');

/** 16px on small screens avoids iOS focus zoom; `sm:` restores compact form typography. */
export const mobileFormControlClass = 'text-base sm:text-sm';

/** Native date/time pickers via `<Input />` — same mobile sizing as track/car fields. */
export const nativePickerInputClass = [mobileFormControlClass, 'box-border overflow-hidden'].join(
  ' ',
);

export const nativePickerWrapperClass = 'min-w-0 max-w-full overflow-hidden';

const NATIVE_PICKER_INPUT_TYPES = new Set([
  'date',
  'datetime-local',
  'time',
  'month',
  'week',
]);

export function isNativePickerInputType(type: string | undefined): boolean {
  return type != null && NATIVE_PICKER_INPUT_TYPES.has(type);
}

/** Native &lt;select&gt; in forms (publish target, channel picker). */
export const selectClass = [
  controlClass,
  controlFocusClass,
  'form-select min-w-0 max-w-full pr-10',
].join(' ');

/** Compact filter/sort controls in list headers (Browse, My Events). */
export const selectMetaClass = [
  'max-w-[6.5rem] cursor-pointer truncate bg-transparent text-[11px] font-medium text-muted',
  'hover:text-slate-300 focus:text-accent-purple-light focus:outline-none',
].join(' ');

export const panelClass = 'rounded-xl border border-white/[0.07] bg-card';

export const panelSoftClass = 'rounded-xl border border-white/[0.08] bg-card';

export const panelDividedClass = 'divide-y divide-white/[0.05]';

export const dividerClass = 'h-px bg-white/[0.05]';

export const emptyIconClass =
  'flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-card text-2xl';

export const emptyDashedClass =
  'rounded-xl border border-dashed border-white/[0.1] py-8 text-center text-sm text-muted';

export const dropdownListClass =
  'absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-white/[0.12] bg-card py-1 shadow-xl';

export const dropdownItemClass =
  'flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-white/[0.06]';

export const listItemClass =
  'flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-slate-300';

export const badgeBaseClass =
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest';

export const iconTileClass =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]';

export const statusPillClass =
  'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1';

export const fileUploadLabelClass =
  'flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/[0.1] px-4 py-3 text-sm text-muted transition-colors hover:border-white/20 hover:text-slate-300';

export const toggleRowClass =
  'flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5';

export const checkboxLabelClass =
  'flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted';

export const navShellBorderClass = 'border-white/[0.07]';

export function controlClassNames(invalid?: boolean, className?: string) {
  return cn(inputClass, invalid && controlInvalidClass, className);
}

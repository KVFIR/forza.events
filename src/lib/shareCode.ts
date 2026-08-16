/** Forza share codes: nine digits as `000 000 000`. */
const DIGIT_GROUPS = [3, 3, 3] as const;
const COMPLETE_SHARE_CODE = /\b(\d{3}) (\d{3}) (\d{3})\b/g;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

/** Display stays grouped; clipboard gets `000000000`. */
export function shareCodeForClipboard(text: string): string {
  return text.replace(COMPLETE_SHARE_CODE, '$1$2$3');
}

export function handleShareCodeCopy(e: {
  target: EventTarget | null;
  preventDefault(): void;
  clipboardData: DataTransfer | null;
}): void {
  const target = e.target;
  const selected =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target.value.slice(target.selectionStart ?? 0, target.selectionEnd ?? 0)
      : (window.getSelection()?.toString() ?? '');
  if (!selected) return;
  const compact =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? digitsOnly(selected)
      : shareCodeForClipboard(selected);
  if (!compact || compact === selected) return;
  e.preventDefault();
  e.clipboardData?.setData('text/plain', compact);
}

/** Second click of a double-click: select the whole code, not one `000` group. */
export function handleShareCodeDoubleClick(e: {
  currentTarget: EventTarget;
  detail: number;
  preventDefault(): void;
}): void {
  if (e.detail !== 2) return;
  e.preventDefault();
  const el = e.currentTarget;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.select();
    return;
  }
  if (!(el instanceof Node)) return;
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function formatShareCode(value: string): string {
  const d = digitsOnly(value);
  if (!d) return '';
  let i = 0;
  const parts: string[] = [];
  for (const len of DIGIT_GROUPS) {
    if (i >= d.length) break;
    parts.push(d.slice(i, i + len));
    i += len;
  }
  return parts.join(' ');
}

export function isCompleteShareCode(value: string): boolean {
  return digitsOnly(value).length === 9;
}

export function normalizeShareCode(value: string): string | null {
  const d = digitsOnly(value);
  if (!d) return null;
  return formatShareCode(d);
}

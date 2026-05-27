import i18n from './index';

export type BusyLabelKey =
  | 'working'
  | 'leaving'
  | 'saving'
  | 'deleting'
  | 'cancelling'
  | 'publishing'
  | 'signingIn';

export function busyLabel(key: BusyLabelKey): string {
  return i18n.t(`busy.${key}`);
}

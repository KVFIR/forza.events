import type {Locale} from 'date-fns';
import {enUS, ru} from 'date-fns/locale';
import i18n from './index';

const LOCALES: Record<string, Locale> = {
  en: enUS,
  ru,
};

export function dateFnsLocale(): Locale {
  const base = i18n.language.split('-')[0];
  return LOCALES[base] ?? enUS;
}

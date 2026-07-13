import {useTranslation} from 'react-i18next';
import type {AppLanguage} from '../i18n';
import {cn} from '../lib/cn';

const OPTIONS: {value: AppLanguage; short: string}[] = [
  {value: 'en', short: 'EN'},
  {value: 'ru', short: 'RU'},
];

type Props = {
  className?: string;
  onLanguageSelect?: (lng: AppLanguage) => void;
};

/** Minimal EN/RU pill — e.g. profile card corner. */
export function LanguageToggle({className, onLanguageSelect}: Props) {
  const {t, i18n} = useTranslation();
  const current = (i18n.language.split('-')[0] === 'ru' ? 'ru' : 'en') as AppLanguage;

  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-white/[0.1] bg-black/25 p-0.5 shadow-sm backdrop-blur-md',
        className,
      )}
      role="group"
      aria-label={t('language.label')}
    >
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            aria-label={t(`language.${opt.value}`)}
            onClick={() => {
              if (!active) {
                void i18n.changeLanguage(opt.value);
                onLanguageSelect?.(opt.value);
              }
            }}
            className={cn(
              'min-w-[2rem] rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200',
              active
                ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'text-muted hover:text-slate-300',
            )}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}

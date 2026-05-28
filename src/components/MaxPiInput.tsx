import {useEffect, useState} from 'react';
import {cn} from '../lib/cn';
import {clampPi, PI_MAX, PI_MIN, piClassColor, piRangeI18nParams, piToClass} from '../lib/pi';
import {useTranslation} from 'react-i18next';

type Props = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  error?: boolean;
  className?: string;
  inputClass?: string;
};

function parsePiDraft(draft: string): number | null {
  const digits = draft.replace(/\D/g, '');
  if (!digits) return null;
  return Number(digits);
}

export function MaxPiInput({value, onChange, id, error, className, inputClass}: Props) {
  const {t} = useTranslation();
  const [draft, setDraft] = useState(String(value));
  const range = piRangeI18nParams();

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const parsed = parsePiDraft(draft);
  const displayPi = parsed !== null ? clampPi(parsed) : value;
  const classLetter = piToClass(displayPi);

  function commit() {
    const next = parsed !== null ? clampPi(parsed) : value;
    setDraft(String(next));
    onChange(next);
  }

  return (
    <div className={cn('flex', className)}>
      <span
        className={cn(
          'flex w-11 shrink-0 items-center justify-center rounded-l-lg border border-r-0 border-white/[0.08] bg-white/[0.06] text-sm font-black tabular-nums',
          piClassColor[classLetter],
        )}
        aria-hidden
      >
        {classLetter}
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={String(PI_MAX).length}
        placeholder={`${PI_MIN}`}
        title={t('validation.piRange', range)}
        className={cn(
          inputClass,
          'rounded-l-none',
          error && 'border-red-500/50 focus:border-red-400/60',
        )}
        value={draft}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, String(PI_MAX).length);
          setDraft(digits);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-invalid={error}
        aria-label={t('create.maxPiAria')}
      />
    </div>
  );
}

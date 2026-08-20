import {useEffect, useState} from 'react';
import {cn} from '../lib/cn';
import {normalizeEventGame, type ForzaGame} from '../lib/eventGames';
import {
  clampPi,
  PI_MAX,
  PI_MIN,
  piClassBorderColor,
  piClassColor,
  piRangeI18nParams,
  piToClass,
  type CarClassLetter,
} from '../lib/pi';
import {useTranslation} from 'react-i18next';

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Class letter bands differ by game (FH5 has no R). */
  game?: ForzaGame;
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

export function MaxPiInput({value, onChange, game = 'fh6', id, error, className, inputClass}: Props) {
  const {t} = useTranslation();
  const g = normalizeEventGame(game);
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const range = piRangeI18nParams(g);

  useEffect(() => {
    setDraft(value == null ? '' : String(value));
  }, [value]);

  const parsed = parsePiDraft(draft);
  const displayPi = parsed !== null ? clampPi(parsed) : value ?? PI_MIN;
  const empty = value == null && parsed === null;
  const classLetter: CarClassLetter | null = empty ? null : piToClass(displayPi, g);

  function commit() {
    if (parsed === null) {
      setDraft('');
      onChange(null);
      return;
    }
    const next = clampPi(parsed);
    setDraft(String(next));
    onChange(next);
  }

  return (
    <div
      className={cn(
        'flex min-w-0 overflow-hidden rounded-lg border bg-white/[0.03]',
        classLetter ? piClassBorderColor[classLetter] : 'border-white/[0.08]',
        'focus-within:border-white/20',
        error && 'border-red-500/50 focus-within:border-red-400/60',
        className,
      )}
    >
      <span
        className={cn(
          'flex w-11 shrink-0 items-center justify-center border-r bg-white/[0.06] text-sm font-black tabular-nums',
          classLetter
            ? [piClassColor[classLetter], piClassBorderColor[classLetter]]
            : 'border-white/[0.08] text-muted',
        )}
        aria-hidden
      >
        {classLetter ?? '—'}
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
          'min-w-0 flex-1 rounded-none border-0 bg-transparent',
          'focus:border-0 focus:outline-none',
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

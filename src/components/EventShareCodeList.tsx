import {useState} from 'react';
import {ShareCodeInput} from './ShareCodeInput';
import {digitsOnly, formatShareCode, isCompleteShareCode} from '../lib/shareCode';
import {cn} from '../lib/cn';

type Props = {
  codes: string[];
  onChange: (codes: string[]) => void;
  inputClass: string;
  labelClass: string;
};

export function EventShareCodeList({codes, onChange, inputClass, labelClass}: Props) {
  const [draft, setDraft] = useState('');

  function updateCommitted(index: number, raw: string) {
    const formatted = formatShareCode(raw);
    if (!digitsOnly(formatted)) {
      onChange(codes.filter((_, i) => i !== index));
      return;
    }
    const next = [...codes];
    next[index] = formatted;
    onChange(next);
  }

  function onDraftChange(raw: string) {
    const formatted = formatShareCode(raw);
    setDraft(formatted);
    if (isCompleteShareCode(formatted)) {
      onChange([...codes, formatted]);
      setDraft('');
    }
  }

  const isFirstRow = codes.length === 0;
  const fadedTrailing = !isFirstRow && !draft;

  return (
    <div>
      <p className={labelClass}>Track list</p>
      <ol className="mt-3 space-y-2">
        {codes.map((code, i) => (
          <li key={`${i}-${code}`} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">
              {i + 1}.
            </span>
            <ShareCodeInput
              value={code}
              onChange={(v) => updateCommitted(i, v)}
              className={cn(inputClass, 'mt-0 flex-1')}
            />
          </li>
        ))}
        <li className="flex items-center gap-3">
          <span
            className={cn(
              'w-5 shrink-0 text-right text-sm font-semibold tabular-nums',
              fadedTrailing ? 'text-muted/50' : 'text-muted',
            )}
          >
            {codes.length + 1}.
          </span>
          <ShareCodeInput
            value={draft}
            onChange={onDraftChange}
            className={cn(inputClass, 'mt-0 flex-1', fadedTrailing && 'opacity-50')}
            semiTransparent={fadedTrailing}
          />
        </li>
      </ol>
    </div>
  );
}

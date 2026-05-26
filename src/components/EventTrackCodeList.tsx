import {useMemo, useState} from 'react';
import {ShareCodeInput} from './ShareCodeInput';
import {digitsOnly, formatShareCode, isCompleteShareCode} from '../lib/shareCode';
import {cn} from '../lib/cn';

type Props = {
  codes: string[];
  onChange: (codes: string[]) => void;
  inputClass: string;
  labelClass: string;
};

export function EventTrackCodeList({codes, onChange, inputClass, labelClass}: Props) {
  const [draft, setDraft] = useState('');

  const normalizedCodes = useMemo(() => codes.filter(Boolean), [codes]);

  function updateCode(index: number, raw: string) {
    const formatted = formatShareCode(raw);
    if (!digitsOnly(formatted)) {
      onChange(normalizedCodes.filter((_, i) => i !== index));
      return;
    }
    const next = [...normalizedCodes];
    next[index] = formatted;
    onChange(next);
  }

  function onDraftChange(raw: string) {
    const formatted = formatShareCode(raw);
    setDraft(formatted);
    if (isCompleteShareCode(formatted)) {
      onChange([...normalizedCodes, formatted]);
      setDraft('');
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={labelClass}>Tracks</p>
        <p className="mt-1 text-xs text-muted">
          Optional — add one or more track share codes for an ordered route list.
        </p>
      </div>

      <ol className="space-y-2">
        {normalizedCodes.map((code, i) => (
          <li key={`${i}-${code}`} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">
              {i + 1}.
            </span>
            <ShareCodeInput
              value={code}
              onChange={(v) => updateCode(i, v)}
              className={cn(inputClass, 'mt-0 flex-1')}
            />
          </li>
        ))}

        <li className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted/50">
            {normalizedCodes.length + 1}.
          </span>
          <ShareCodeInput
            value={draft}
            onChange={onDraftChange}
            className={cn(inputClass, 'mt-0 flex-1 opacity-50')}
            semiTransparent
          />
        </li>
      </ol>
    </div>
  );
}

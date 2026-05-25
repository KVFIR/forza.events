import {useState} from 'react';
import {ShareCodeInput} from './ShareCodeInput';
import {digitsOnly, formatShareCode, isCompleteShareCode} from '../lib/shareCode';
import {cn} from '../lib/cn';

type Props = {
  primaryCode: string;
  extraCodes: string[];
  onPrimaryChange: (code: string) => void;
  onExtrasChange: (codes: string[]) => void;
  inputClass: string;
  labelClass: string;
};

export function EventShareCodeList({
  primaryCode,
  extraCodes,
  onPrimaryChange,
  onExtrasChange,
  inputClass,
  labelClass,
}: Props) {
  const [draft, setDraft] = useState('');

  function updateExtra(index: number, raw: string) {
    const formatted = formatShareCode(raw);
    if (!digitsOnly(formatted)) {
      onExtrasChange(extraCodes.filter((_, i) => i !== index));
      return;
    }
    const next = [...extraCodes];
    next[index] = formatted;
    onExtrasChange(next);
  }

  function onDraftChange(raw: string) {
    const formatted = formatShareCode(raw);
    setDraft(formatted);
    if (isCompleteShareCode(formatted)) {
      onExtrasChange([...extraCodes, formatted]);
      setDraft('');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className={labelClass}>Primary track code</p>
        <ShareCodeInput
          value={primaryCode}
          onChange={onPrimaryChange}
          className={cn(inputClass, 'mt-2')}
        />
      </div>

      <div>
        <p className={labelClass}>Extra track codes (optional)</p>
        <ol className="mt-3 space-y-2">
          {extraCodes.map((code, i) => (
            <li key={`${i}-${code}`} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">
                {i + 1}.
              </span>
              <ShareCodeInput
                value={code}
                onChange={(v) => updateExtra(i, v)}
                className={cn(inputClass, 'mt-0 flex-1')}
              />
            </li>
          ))}
          <li className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted/50">
              {extraCodes.length + 1}.
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
    </div>
  );
}

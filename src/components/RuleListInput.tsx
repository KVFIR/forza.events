import {useState} from 'react';
import {Plus, X} from 'lucide-react';
import {Button} from './ui/Button';

const DEFAULT_TEMPLATES = [
  'Clean racing only',
  'No ramming',
  'Collisions on',
  'No meta abuse',
  'Stock tune only',
  'No PIT',
];

type Props = {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  templates?: string[];
};

export function RuleListInput({label, items, onChange, templates = DEFAULT_TEMPLATES}: Props) {
  const [draft, setDraft] = useState('');

  function addItem(text: string) {
    const t = text.trim();
    if (!t || items.includes(t)) return;
    onChange([...items, t]);
    setDraft('');
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {templates.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => addItem(t)}
            className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-muted hover:border-accent-purple/30 hover:text-slate-300"
          >
            + {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem(draft);
            }
          }}
          placeholder="Custom rule…"
          className="flex-1 rounded-xl border border-white/[0.08] bg-surface px-3 py-2 text-sm text-white"
        />
        <Button type="button" variant="secondary" onClick={() => addItem(draft)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-slate-300"
          >
            {item}
            <button type="button" onClick={() => onChange(items.filter((i) => i !== item))}>
              <X className="h-3.5 w-3.5 text-muted hover:text-white" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

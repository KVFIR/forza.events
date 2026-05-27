import {useState} from 'react';
import {Plus, X} from 'lucide-react';
import {Button} from './ui/Button';
import {templateChipClass} from './ui/buttonStyles';
import {Input} from './ui/Input';
import {FieldLabel} from './ui/FieldLabel';
import {listItemClass} from './ui/formStyles';

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
  customRulePlaceholder?: string;
};

export function RuleListInput({
  label,
  items,
  onChange,
  templates = DEFAULT_TEMPLATES,
  customRulePlaceholder = 'Custom rule…',
}: Props) {
  const [draft, setDraft] = useState('');

  function addItem(text: string) {
    const t = text.trim();
    if (!t || items.includes(t)) return;
    onChange([...items, t]);
    setDraft('');
  }

  return (
    <div>
      <FieldLabel className="mb-2 block">{label}</FieldLabel>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {templates.map((t) => (
          <button key={t} type="button" onClick={() => addItem(t)} className={templateChipClass}>
            + {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem(draft);
            }
          }}
          placeholder={customRulePlaceholder}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={() => addItem(draft)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className={listItemClass}
          >
            {item}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted hover:text-white"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(items.filter((i) => i !== item))}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

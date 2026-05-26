import {useEffect, useRef, useState} from 'react';
import {Trash2} from 'lucide-react';
import {piToClass} from '../lib/pi';
import {MaxPiInput} from './MaxPiInput';
import {searchCars, type CarSearchResult} from '../lib/events';
import {ShareCodeInput} from './ShareCodeInput';
import {TuningRestrictionsInput} from './TuningRestrictionsInput';
import {formatShareCode} from '../lib/shareCode';
import {cn} from '../lib/cn';
import {Button} from './ui/Button';
import {DropdownItem, DropdownList} from './ui/DropdownList';
import {EmptyPlaceholder} from './ui/EmptyPlaceholder';
import {FieldLabel} from './ui/FieldLabel';
import {Panel} from './ui/Panel';

export type EventCarEntry = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
  maxPi: number;
  tuneShareCode: string;
  restrictions: string[];
};

type Props = {
  cars: EventCarEntry[];
  onChange: (cars: EventCarEntry[]) => void;
  inputClass: string;
  labelClass: string;
};

function toEntry(c: CarSearchResult): EventCarEntry {
  return {
    id: c.id,
    make: c.make,
    model: c.model,
    year: c.year,
    pi: c.pi,
    maxPi: c.pi,
    tuneShareCode: '',
    restrictions: [],
  };
}

export function EventCarList({cars, onChange, inputClass, labelClass}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CarSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      void searchCars(query).then((r) => {
        const picked = new Set(cars.map((c) => c.id));
        setResults(r.filter((c) => !picked.has(c.id)));
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query, cars]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function addCar(c: CarSearchResult) {
    onChange([...cars, toEntry(c)]);
    setQuery('');
    setOpen(false);
  }

  function update(id: string, patch: Partial<EventCarEntry>) {
    onChange(cars.map((c) => (c.id === id ? {...c, ...patch} : c)));
  }

  function remove(id: string) {
    onChange(cars.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className={labelClass}>Car list</p>
        <div ref={wrapRef} className="relative mt-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search make or model…"
              className={cn(inputClass, 'mt-0 flex-1')}
            />
          </div>
          {open && query.trim() && (
            <DropdownList>
              {results.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted">No matches</li>
              ) : (
                results.map((c) => (
                  <DropdownItem key={c.id} onClick={() => addCar(c)}>
                    <span>
                      {c.model}
                      {c.year ? ` · ${c.year}` : ''}
                    </span>
                    <span className="text-xs text-muted">
                      {c.pi} {piToClass(c.pi)}
                    </span>
                  </DropdownItem>
                ))
              )}
            </DropdownList>
          )}
        </div>
      </div>

      {cars.length === 0 ? (
        <EmptyPlaceholder>No cars yet. Search above to add one.</EmptyPlaceholder>
      ) : (
        <ul className="space-y-3">
          {cars.map((c) => (
            <li key={c.id}>
              <Panel variant="soft" className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{c.model}</p>
                  <p className="text-xs text-muted">
                    Stock {c.pi} {piToClass(c.pi)}
                    {c.year ? ` · ${c.year}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted hover:text-accent-red"
                  onClick={() => remove(c.id)}
                  aria-label="Remove car"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel className="block">Max PI</FieldLabel>
                  <MaxPiInput
                    className="mt-1.5"
                    inputClass={inputClass}
                    value={c.maxPi}
                    onChange={(maxPi) => update(c.id, {maxPi})}
                  />
                </div>
                <div>
                  <FieldLabel className="block">Tune share code</FieldLabel>
                  <ShareCodeInput
                    className={inputClass}
                    value={c.tuneShareCode}
                    onChange={(v) => update(c.id, {tuneShareCode: formatShareCode(v)})}
                  />
                </div>
              </div>

              <TuningRestrictionsInput
                items={c.restrictions}
                onChange={(items) => update(c.id, {restrictions: items})}
              />
              </Panel>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

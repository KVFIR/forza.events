import {useEffect, useRef, useState} from 'react';
import {ChevronDown, ChevronUp, Trash2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {formatCarDisplayName} from '../lib/carDisplay';
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
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CarSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
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
    const entry = toEntry(c);
    onChange([...cars, entry]);
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      for (const car of cars) next.add(car.id);
      next.delete(entry.id);
      return next;
    });
    setQuery('');
    setOpen(false);
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isCollapsed(id: string) {
    return collapsedIds.has(id);
  }

  function update(id: string, patch: Partial<EventCarEntry>) {
    onChange(cars.map((c) => (c.id === id ? {...c, ...patch} : c)));
  }

  function remove(id: string) {
    onChange(cars.filter((c) => c.id !== id));
    setCollapsedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className={labelClass}>{t('create.carList')}</p>
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
              placeholder={t('create.searchCars')}
              className={cn(inputClass, 'mt-0 flex-1')}
            />
          </div>
          {open && query.trim() && (
            <DropdownList>
              {results.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted">{t('create.carSearchNoMatch')}</li>
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
        <EmptyPlaceholder>{t('create.noCarsYet')}</EmptyPlaceholder>
      ) : (
        <ul className="space-y-3">
          {cars.map((c) => {
            const collapsed = isCollapsed(c.id);
            const displayName = formatCarDisplayName(c);
            const maxClass = piToClass(c.maxPi);
            return (
            <li key={c.id}>
              <Panel variant="soft" className="p-0">
              <div className={cn('flex items-start gap-1 p-4', !collapsed && 'pb-3')}>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                  onClick={() => toggleCollapsed(c.id)}
                  aria-expanded={!collapsed}
                  aria-controls={`event-car-${c.id}-details`}
                >
                  <span className="mt-0.5 shrink-0 text-muted" aria-hidden>
                    {collapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{displayName}</p>
                    <p className="text-xs text-muted">
                      {collapsed
                        ? t('create.carSummaryCollapsed', {
                            maxPi: c.maxPi,
                            class: maxClass,
                          })
                        : [
                            t('create.carSummaryStock', {
                              pi: c.pi,
                              class: piToClass(c.pi),
                            }),
                            c.year != null ? String(c.year) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted hover:text-accent-red"
                  onClick={() => remove(c.id)}
                  aria-label={t('create.removeCar')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {!collapsed ? (
                <div
                  id={`event-car-${c.id}-details`}
                  className="space-y-3 border-t border-white/5 p-4 pt-3"
                >
                  <div className="grid grid-cols-2 items-start gap-3">
                    <div>
                      <FieldLabel className="mb-1.5 block">{t('create.maxPi')}</FieldLabel>
                      <MaxPiInput
                        inputClass={inputClass}
                        value={c.maxPi}
                        onChange={(maxPi) => update(c.id, {maxPi})}
                      />
                    </div>
                    <div>
                      <FieldLabel className="mb-1.5 block">{t('create.tuneShareCode')}</FieldLabel>
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
                </div>
              ) : null}
              </Panel>
            </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}

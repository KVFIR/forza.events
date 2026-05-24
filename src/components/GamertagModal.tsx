import {useState} from 'react';
import {gamertagError} from '../lib/gamertag';
import {Button} from './ui/Button';
import {cn} from '../lib/cn';

type Props = {
  open: boolean;
  initialValue?: string;
  saving?: boolean;
  onSave: (gamertag: string) => void | Promise<void>;
  onClose?: () => void;
};

const inputClass = [
  'mt-2 w-full rounded-xl border border-white/[0.08] bg-surface px-4 py-3',
  'text-sm text-white placeholder:text-muted',
  'focus:border-accent-purple/50 focus:outline-none focus:ring-1 focus:ring-accent-purple/40',
].join(' ');

export function GamertagModal({open, initialValue = '', saving, onSave, onClose}: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = gamertagError(value);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    await onSave(value.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-card p-5 shadow-xl"
      >
        <h2 className="text-lg font-bold text-white">Xbox Gamertag required</h2>
        <p className="mt-1 text-sm text-muted">
          Enter your Xbox Gamertag to join events. It is shown to the host and other players.
        </p>
        <label htmlFor="gamertag" className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-muted">
          Gamertag
        </label>
        <input
          id="gamertag"
          className={cn(inputClass, error && 'border-accent-red/50')}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Your Xbox GT"
          maxLength={15}
          autoFocus
        />
        {error && <p className="mt-2 text-xs text-accent-red">{error}</p>}
        <div className="mt-5 flex gap-2">
          {onClose && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Save & continue'}
          </Button>
        </div>
      </form>
    </div>
  );
}

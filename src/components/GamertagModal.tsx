import {useEffect, useState} from 'react';
import {gamertagError} from '../lib/gamertag';
import {Button} from './ui/Button';
import {BUSY_LABEL, modalPanelClass} from './ui/buttonStyles';
import {FieldLabel} from './ui/FieldLabel';
import {Input} from './ui/Input';
import {fieldErrorClass} from './ui/formStyles';
import {ModalBackdrop} from './ui/ModalShell';

type Props = {
  open: boolean;
  initialValue?: string;
  saving?: boolean;
  onSave: (gamertag: string) => void | Promise<void>;
  onClose?: () => void;
};

export function GamertagModal({open, initialValue = '', saving, onSave, onClose}: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

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
    <ModalBackdrop onBackdropClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className={modalPanelClass}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white">Xbox gamertag required</h2>
        <p className="mt-1 text-sm text-muted">
          Enter your Xbox gamertag to join events. It is shown to the host and other players.
        </p>
        <FieldLabel htmlFor="gamertag" className="mt-4 block">
          Gamertag
        </FieldLabel>
        <Input
          id="gamertag"
          className="mt-2"
          invalid={Boolean(error)}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Your Xbox GT"
          maxLength={15}
          autoFocus
        />
        {error && <p className={fieldErrorClass}>{error}</p>}
        <div className="mt-5 flex gap-2">
          {onClose && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
            {saving ? BUSY_LABEL.saving : 'Save & join'}
          </Button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

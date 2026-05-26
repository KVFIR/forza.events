import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {gamertagError} from '../lib/gamertag';
import {Button} from './ui/Button';
import {modalPanelClass} from './ui/buttonStyles';
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
  const {t} = useTranslation();
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
        <h2 className="text-lg font-bold text-white">{t('gamertag.modalTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('gamertag.modalBody')}</p>
        <FieldLabel htmlFor="gamertag" className="mt-4 block">
          {t('gamertag.label')}
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
          placeholder={t('gamertag.placeholder')}
          maxLength={15}
          autoFocus
        />
        {error && <p className={fieldErrorClass}>{error}</p>}
        <div className="mt-5 flex gap-2">
          {onClose && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
            {saving ? busyLabel('saving') : t('gamertag.saveAndJoin')}
          </Button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

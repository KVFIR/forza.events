import {useTranslation} from 'react-i18next';
import {ConfirmDialog} from '../../../components/ui/ConfirmDialog';
import {GamertagModal} from '../../../components/GamertagModal';

type Props = {
  gamertagOpen: boolean;
  gamertagInitial: string;
  joining: boolean;
  onGamertagSave: (gamertag: string) => void;
  onGamertagClose: () => void;
  confirmAction: 'cancel' | null;
  cancelling: boolean;
  onConfirmDismiss: () => void;
  onCancelConfirm: () => void;
};

export function EventDetailDialogs({
  gamertagOpen,
  gamertagInitial,
  joining,
  onGamertagSave,
  onGamertagClose,
  confirmAction,
  cancelling,
  onConfirmDismiss,
  onCancelConfirm,
}: Props) {
  const {t} = useTranslation();

  return (
    <>
      <GamertagModal
        open={gamertagOpen}
        initialValue={gamertagInitial}
        saving={joining}
        onSave={onGamertagSave}
        onClose={onGamertagClose}
      />

      <ConfirmDialog
        open={confirmAction === 'cancel'}
        title={t('eventDetail.cancelEventTitle')}
        description={t('eventDetail.cancelEventDesc')}
        confirmLabel={t('eventDetail.cancelEvent')}
        variant="danger"
        busy={cancelling}
        onCancel={onConfirmDismiss}
        onConfirm={onCancelConfirm}
      />
    </>
  );
}

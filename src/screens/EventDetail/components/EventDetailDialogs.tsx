import {useTranslation} from 'react-i18next';
import {ConfirmDialog} from '../../../components/ui/ConfirmDialog';
import {GamertagModal} from '../../../components/GamertagModal';

type Props = {
  gamertagOpen: boolean;
  gamertagInitial: string;
  joining: boolean;
  onGamertagSave: (gamertag: string) => void;
  onGamertagClose: () => void;
  waitlistConfirmOpen: boolean;
  onWaitlistConfirm: () => void;
  onWaitlistDismiss: () => void;
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
  waitlistConfirmOpen,
  onWaitlistConfirm,
  onWaitlistDismiss,
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
        open={waitlistConfirmOpen}
        title={t('notifications.joinWaitlistTitle')}
        description={t('notifications.joinWaitlistBody')}
        confirmLabel={t('notifications.joinWaitlistConfirm')}
        busy={joining}
        onCancel={onWaitlistDismiss}
        onConfirm={onWaitlistConfirm}
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

import {useTranslation} from 'react-i18next';
import {ConfirmDialog} from '../../../components/ui/ConfirmDialog';
import {GamertagModal} from '../../../components/GamertagModal';

type Props = {
  gamertagOpen: boolean;
  gamertagInitial: string;
  joining: boolean;
  onGamertagSave: (gamertag: string) => void;
  onGamertagClose: () => void;
  confirmAction: 'delete' | 'cancel' | null;
  deleting: boolean;
  cancelling: boolean;
  onConfirmDismiss: () => void;
  onDeleteConfirm: () => void;
  onCancelConfirm: () => void;
};

export function EventDetailDialogs({
  gamertagOpen,
  gamertagInitial,
  joining,
  onGamertagSave,
  onGamertagClose,
  confirmAction,
  deleting,
  cancelling,
  onConfirmDismiss,
  onDeleteConfirm,
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
        open={confirmAction === 'delete'}
        title={t('eventDetail.deleteDraftTitle')}
        description={t('eventDetail.deleteDraftDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
        busy={deleting}
        onCancel={onConfirmDismiss}
        onConfirm={onDeleteConfirm}
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

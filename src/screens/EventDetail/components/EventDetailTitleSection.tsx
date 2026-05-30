import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {busyLabel} from '../../../i18n/busyLabels';
import {Badge, DraftBadge, StatusBadge} from '../../../components/ui/Badge';
import {Button} from '../../../components/ui/Button';
import {resolveOrganiserLabel} from '../../../lib/organiser';
import {
  participationButtonLabel,
  participationButtonVariant,
} from '../../../lib/eventActions';
import type {EventStatus, ForzaEvent} from '../../../lib/types';
import type {EventDetailViewModel} from '../eventDetailView';

type Props = {
  event: ForzaEvent;
  displayStatus: EventStatus;
  view: Pick<
    EventDetailViewModel,
    | 'isDraft'
    | 'showDraftActions'
    | 'showHostPostStartActions'
    | 'canEnterResults'
    | 'canCancel'
    | 'canDelete'
    | 'canEdit'
    | 'isHost'
    | 'showParticipantActions'
    | 'needsSignInToParticipate'
    | 'joined'
    | 'registrationOpen'
    | 'full'
    | 'canLeave'
    | 'participationAction'
    | 'isCurrentConvoyLeader'
    | 'participationDisabled'
    | 'participationBusy'
  >;
  deleting: boolean;
  cancelling: boolean;
  authRetrying: boolean;
  leaving: boolean;
  onConfirmDelete: () => void;
  onConfirmCancel: () => void;
  onJoinClick: () => void;
};

export function EventDetailTitleSection({
  event,
  displayStatus,
  view,
  deleting,
  cancelling,
  authRetrying,
  leaving,
  onConfirmDelete,
  onConfirmCancel,
  onJoinClick,
}: Props) {
  const {t} = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge type={event.type} />
          {view.isDraft ? <DraftBadge /> : <StatusBadge status={displayStatus} />}
        </div>
        <h1 className="mt-1.5 text-xl font-black tracking-tight text-white">{event.title}</h1>
        {event.description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{event.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted">
          {t('common.by')} {resolveOrganiserLabel(event)}
        </p>
      </div>
      {view.showDraftActions ? (
        <div className="flex shrink-0 flex-col gap-2">
          <Button
            variant="primary"
            size="toolbar"
            className="shrink-0 whitespace-nowrap"
            onClick={() => navigate(`/create?edit=${event.id}`)}
          >
            {t('eventDetail.continueEditing')}
          </Button>
          {view.canDelete ? (
            <Button
              variant="danger"
              size="toolbar"
              className="shrink-0 whitespace-nowrap"
              disabled={deleting}
              onClick={onConfirmDelete}
            >
              {deleting ? busyLabel('deleting') : t('eventDetail.deleteDraft')}
            </Button>
          ) : null}
        </div>
      ) : view.showHostPostStartActions ? (
        <div className="flex shrink-0 flex-col gap-2">
          {view.canEnterResults ? (
            <Button
              variant="primary"
              size="toolbar"
              className="shrink-0 whitespace-nowrap"
              onClick={() => navigate(`/event/${event.id}/results`)}
            >
              {t('eventDetail.submitResults')}
            </Button>
          ) : null}
          {view.canCancel ? (
            <Button
              variant="danger"
              size="toolbar"
              className="shrink-0 whitespace-nowrap"
              disabled={cancelling}
              onClick={onConfirmCancel}
            >
              {cancelling ? busyLabel('cancelling') : t('eventDetail.cancelEvent')}
            </Button>
          ) : null}
        </div>
      ) : view.isHost ? (
        view.canEdit ? (
          <Button
            variant="secondary"
            size="toolbar"
            className="shrink-0 whitespace-nowrap"
            onClick={() => navigate(`/create?edit=${event.id}`)}
          >
            {t('eventDetail.edit')}
          </Button>
        ) : null
      ) : view.showParticipantActions ? (
        <Button
          variant={
            view.needsSignInToParticipate
              ? 'secondary'
              : participationButtonVariant(
                  view.joined,
                  view.registrationOpen,
                  view.full,
                  view.canLeave,
                  view.participationAction,
                  view.isCurrentConvoyLeader,
                )
          }
          size="toolbar"
          className="shrink-0 whitespace-nowrap"
          disabled={view.needsSignInToParticipate ? authRetrying : view.participationDisabled}
          onClick={onJoinClick}
        >
          {view.needsSignInToParticipate
            ? authRetrying
              ? busyLabel('signingIn')
              : t('auth.signInToJoin')
            : view.participationBusy
              ? leaving
                ? busyLabel('leaving')
                : busyLabel('working')
              : participationButtonLabel(
                  view.joined,
                  view.registrationOpen,
                  view.full,
                  view.canLeave,
                  view.isCurrentConvoyLeader,
                )}
        </Button>
      ) : null}
    </div>
  );
}

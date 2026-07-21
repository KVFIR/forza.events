import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {busyLabel} from '../../../i18n/busyLabels';
import {Badge, DraftBadge, GameBadge, StatusBadge} from '../../../components/ui/Badge';
import {Button} from '../../../components/ui/Button';
import {Alert} from '../../../components/ui/Alert';
import {
  participationButtonLabel,
  participationButtonVariant,
} from '../../../lib/eventActions';
import type {EventStatus, ForzaEvent} from '../../../lib/types';
import type {EventDetailViewModel} from '../eventDetailView';
import {EventRegistrationProgress} from './EventDetailProgressSection';

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
    | 'ev'
    | 'fillPct'
    | 'showRegistrationProgress'
    | 'registrationOpen'
    | 'showJoinXboxHint'
    | 'showConvoyLeaderXboxHint'
    | 'viewerConvoyLeader'
    | 'totalCapacity'
    | 'onWaitlist'
    | 'willWaitlist'
  >;
  cancelling: boolean;
  authRetrying: boolean;
  leaving: boolean;
  onConfirmCancel: () => void;
  onJoinClick: () => void;
  /** Original list referrer for nested navigation (e.g. results). */
  detailFrom?: string;
};

export function EventDetailTitleSection({
  event,
  displayStatus,
  view,
  cancelling,
  authRetrying,
  leaving,
  onConfirmCancel,
  onJoinClick,
  detailFrom,
}: Props) {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const participationButton = view.showParticipantActions ? (
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
              {onWaitlist: view.onWaitlist, willWaitlist: view.willWaitlist},
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
              {onWaitlist: view.onWaitlist, willWaitlist: view.willWaitlist},
            )}
    </Button>
  ) : null;

  const titleRowAction = view.showDraftActions ? (
    <Button
      variant="primary"
      size="toolbar"
      className="shrink-0 whitespace-nowrap"
      onClick={() => navigate(`/create?edit=${event.id}`)}
    >
      {t('eventDetail.continueEditing')}
    </Button>
  ) : view.showHostPostStartActions ? (
    <div className="flex shrink-0 flex-col gap-2">
      {view.canEnterResults ? (
        <Button
          variant="primary"
          size="toolbar"
          className="shrink-0 whitespace-nowrap"
          onClick={() =>
            navigate(`/event/${event.id}/results`, {state: {from: detailFrom}})
          }
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
  ) : (
    participationButton
  );

  return (
    <div>
      <div className="relative z-10 -mt-10 flex items-center gap-3 sm:-mt-12">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <GameBadge game={event.game} variant="full" />
            <Badge type={event.type} />
            {view.isDraft ? <DraftBadge /> : <StatusBadge status={displayStatus} />}
          </div>
          <h1 className="mt-1.5 text-xl font-black tracking-tight text-white">{event.title}</h1>
        </div>
        {titleRowAction ? <div className="shrink-0">{titleRowAction}</div> : null}
      </div>

      <EventRegistrationProgress view={view} />

      {view.showJoinXboxHint && view.viewerConvoyLeader ? (
        <Alert variant="info" title={t('participation.xboxHintTitle')} className="mt-2 py-2.5 text-sm">
          {t('participation.xboxHintBody', {leader: view.viewerConvoyLeader.gamertag})}
        </Alert>
      ) : view.showConvoyLeaderXboxHint ? (
        <Alert
          variant="info"
          title={t('participation.convoyLeaderXboxHintTitle')}
          className="mt-2 py-2.5 text-sm"
        >
          {t('participation.convoyLeaderXboxHintBody')}
        </Alert>
      ) : null}
    </div>
  );
}

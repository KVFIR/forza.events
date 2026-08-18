import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {busyLabel} from '../../../i18n/busyLabels';
import {Badge, DraftBadge, GameBadge, RankedBadge, StatusBadge} from '../../../components/ui/Badge';
import {Button} from '../../../components/ui/Button';
import {
  participationButtonLabel,
  participationButtonVariant,
} from '../../../lib/eventActions';
import type {EventLifecycle, EventStatus, ForzaEvent} from '../../../lib/types';
import {eventDetailPath} from '@edge/eventPath.ts';
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
    | 'canCompleteWithoutResults'
    | 'canRetryRatings'
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
    | 'totalCapacity'
    | 'onWaitlist'
    | 'willWaitlist'
  >;
  cancelling: boolean;
  completing: boolean;
  retryingRatings: boolean;
  authRetrying: boolean;
  leaving: boolean;
  onConfirmCancel: () => void;
  onConfirmComplete: () => void;
  onRetryRatings: () => void;
  onJoinClick: () => void;
  /** Original list referrer for nested navigation (e.g. results). */
  detailFrom?: string;
};

export function EventDetailTitleSection({
  event,
  displayStatus,
  view,
  cancelling,
  completing,
  retryingRatings,
  authRetrying,
  leaving,
  onConfirmCancel,
  onConfirmComplete,
  onRetryRatings,
  onJoinClick,
  detailFrom,
}: Props) {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const statusChip = titleStatusChip(view.isDraft, event.lifecycle, displayStatus);

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
            navigate(eventDetailPath(event, {results: true}), {state: {from: detailFrom}})
          }
        >
          {t('eventDetail.submitResults')}
        </Button>
      ) : null}
      {view.canCompleteWithoutResults ? (
        <Button
          variant="primary"
          size="toolbar"
          className="shrink-0 whitespace-nowrap"
          disabled={completing}
          onClick={onConfirmComplete}
        >
          {completing ? busyLabel('saving') : t('eventDetail.markFinished')}
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
  ) : view.canRetryRatings ? (
    <Button
      variant="primary"
      size="toolbar"
      className="shrink-0 whitespace-nowrap"
      disabled={retryingRatings}
      onClick={onRetryRatings}
    >
      {retryingRatings ? busyLabel('working') : t('eventDetail.retryRatings')}
    </Button>
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
          <h1 className="text-xl font-black tracking-tight text-white">{event.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {statusChip}
            {event.isRanked ? <RankedBadge className="px-1.5 py-px" /> : null}
            <Badge className="px-1.5 py-px" type={event.type} />
            <GameBadge className="px-1.5 py-px" game={event.game} />
          </div>
        </div>
        {titleRowAction ? <div className="shrink-0">{titleRowAction}</div> : null}
      </div>

      <EventRegistrationProgress view={view} />
    </div>
  );
}

function titleStatusChip(
  isDraft: boolean,
  lifecycle: EventLifecycle,
  displayStatus: EventStatus,
) {
  const chipClass = 'px-1.5 py-px';
  if (isDraft) return <DraftBadge className={chipClass} />;
  switch (lifecycle) {
    case 'cancelled':
      return <StatusBadge className={chipClass} status="cancelled" />;
    case 'archived':
      return <StatusBadge className={chipClass} status="archived" />;
    case 'completed':
      return <StatusBadge className={chipClass} status="completed" />;
    case 'draft':
      return <DraftBadge className={chipClass} />;
    case 'open':
    case 'live':
      if (displayStatus === 'open' || displayStatus === 'ended') return null;
      return <StatusBadge className={chipClass} status={displayStatus} />;
    default: {
      const _never: never = lifecycle;
      return _never;
    }
  }
}

import {useTranslation} from 'react-i18next';
import {Alert} from '../../../components/ui/Alert';
import {EventStatusBanner} from '../../../components/EventStatusBanner';
import {cn} from '../../../lib/cn';
import type {ForzaEvent} from '../../../lib/types';
import {eventDetailRankedHintClass} from '../../../components/eventDetailHintStyles';
import type {EventDetailViewModel} from '../eventDetailView';

type Props = {
  event: ForzaEvent;
  view: Pick<
    EventDetailViewModel,
    | 'isDraft'
    | 'isHost'
    | 'isInParticipants'
    | 'showHostPostStartActions'
    | 'finalized'
    | 'started'
  >;
  joinError: string | null;
  actionError: string | null;
};

export function EventDetailStatusSection({event, view, joinError, actionError}: Props) {
  const {t} = useTranslation();

  return (
    <>
      {event.isRanked ? (
        <Alert
          variant="info"
          title={t('eventDetail.rankedTitle')}
          className={cn('mt-3', eventDetailRankedHintClass)}
        >
          {t('eventDetail.rankedExplainer')}
        </Alert>
      ) : null}
      {view.isDraft && view.isHost ? <EventStatusBanner variant="draft" /> : null}
      {view.showHostPostStartActions ? <EventStatusBanner variant="host-in-progress" /> : null}
      {!view.isHost &&
      !view.isInParticipants &&
      view.started &&
      !view.finalized ? (
        <EventStatusBanner variant="registration-closed" />
      ) : null}
      {event.lifecycle === 'cancelled' ? <EventStatusBanner variant="cancelled" /> : null}

      {joinError ? <p className="mt-3 text-sm text-accent-red">{joinError}</p> : null}
      {actionError ? <p className="mt-3 text-sm text-accent-red">{actionError}</p> : null}
    </>
  );
}

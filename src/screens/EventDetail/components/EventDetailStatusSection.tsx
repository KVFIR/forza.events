import {EventStatusBanner} from '../../../components/EventStatusBanner';
import type {ForzaEvent} from '../../../lib/types';
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
  return (
    <>
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

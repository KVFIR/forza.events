import {useTranslation} from 'react-i18next';
import {EventStatusBanner} from '../../../components/EventStatusBanner';
import type {ForzaEvent} from '../../../lib/types';
import type {EventDetailViewModel} from '../eventDetailView';

type Props = {
  event: ForzaEvent;
  view: Pick<
    EventDetailViewModel,
    | 'isDraft'
    | 'isHost'
    | 'showHostPostStartActions'
    | 'finalized'
    | 'started'
    | 'showJoinNotifyHint'
  >;
  joinError: string | null;
  actionError: string | null;
};

export function EventDetailStatusSection({event, view, joinError, actionError}: Props) {
  const {t} = useTranslation();

  return (
    <>
      {view.isDraft && view.isHost ? <EventStatusBanner variant="draft" /> : null}
      {view.showHostPostStartActions ? <EventStatusBanner variant="host-in-progress" /> : null}
      {!view.isHost && view.started && !view.finalized ? (
        <EventStatusBanner variant="registration-closed" />
      ) : null}
      {event.lifecycle === 'cancelled' ? <EventStatusBanner variant="cancelled" /> : null}

      {view.showJoinNotifyHint ? (
        <p className="mt-3 text-xs text-muted">{t('notifications.joinHint')}</p>
      ) : null}

      {joinError ? <p className="mt-3 text-sm text-accent-red">{joinError}</p> : null}
      {actionError ? <p className="mt-3 text-sm text-accent-red">{actionError}</p> : null}
    </>
  );
}

import {COVER_HERO_BAND_CLASS, COVER_PAGE_BLEED_CLASS, coverDisplayUrl} from '../../../lib/coverImage';
import {defaultCoverPath} from '../../../lib/eventCovers';
import type {ForzaEvent} from '../../../lib/types';
import {cn} from '../../../lib/cn';

type Props = {
  event: ForzaEvent;
};

export function EventDetailHero({event}: Props) {
  return (
    <div
      className={cn(
        'event-detail-hero relative mb-0 overflow-hidden rounded-t-xl bg-base bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-white/[0.08] sm:rounded-t-2xl',
        COVER_PAGE_BLEED_CLASS,
        COVER_HERO_BAND_CLASS,
      )}
      style={{
        backgroundImage: `url(${coverDisplayUrl(
          event.coverImageUrl ?? defaultCoverPath(event.type),
          'hero',
        )})`,
      }}
      role="img"
      aria-label={event.title}
    >
      <div
        className="event-detail-hero-fade pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 sm:h-28"
        aria-hidden
      />
    </div>
  );
}

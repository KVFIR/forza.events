import {COVER_HERO_BAND_CLASS, coverDisplayUrl} from '../../../lib/coverImage';
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
        'event-detail-hero relative mb-0 overflow-hidden bg-base bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-white/[0.08]',
        COVER_HERO_BAND_CLASS,
        'max-w-none -mx-3 w-[calc(100%+1.5rem)]',
        'sm:-mx-5 sm:w-[calc(100%+2.5rem)]',
        'md:mx-[calc(50%-50vw)] md:w-screen',
        'lg:mr-0 lg:w-[calc(100vw-var(--app-sidebar-width))] lg:ml-[calc(var(--app-sidebar-width)-2.5rem-max(var(--app-sidebar-width),calc(50vw-var(--app-content-max-width)/2)))]',
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
        className="event-detail-hero-fade pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 sm:h-40"
        aria-hidden
      />
    </div>
  );
}

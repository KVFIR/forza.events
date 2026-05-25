import {format} from 'date-fns';
import {Link} from 'react-router-dom';
import {Users} from 'lucide-react';
import type {EventAllowedCar, EventType, ForzaEvent} from '../lib/types';
import {cn} from '../lib/cn';
import {formatLobbyCount} from '../lib/constants';
import {piToClass} from '../lib/pi';
import {useAuth} from '../context/AuthContext';

type Props = {
  event: ForzaEvent;
};

const typeAccentBar: Record<EventType, string> = {
  road: 'bg-rose-500/25',
  dirt: 'bg-amber-500/25',
  drift: 'bg-fuchsia-500/25',
  touge: 'bg-violet-500/25',
};

const classColor: Record<string, string> = {
  D: 'text-slate-400',
  C: 'text-yellow-400/90',
  B: 'text-orange-400/90',
  A: 'text-red-400/90',
  S1: 'text-violet-400/90',
  S2: 'text-fuchsia-400/90',
  R: 'text-amber-400/90',
};

const MAX_CARS_SHOWN = 4;

function CarList({cars}: {cars: EventAllowedCar[]}) {
  const shown = cars.slice(0, MAX_CARS_SHOWN);
  const extra = cars.length - shown.length;

  return (
    <div className="shrink-0 text-left">
      <ul className="flex flex-col divide-y divide-white/[0.05]">
        {shown.map((car) => {
          const maxClass = piToClass(car.maxPi);

          return (
            <li
              key={car.carId}
              className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2.5 py-1 text-[10px] leading-tight first:pt-0 last:pb-0"
            >
              <span className="truncate font-medium text-slate-200">
                {car.make} {car.model}
              </span>
              <span
                className={cn(
                  'text-right font-bold tabular-nums',
                  classColor[maxClass] ?? 'text-muted',
                )}
              >
                {maxClass} {car.maxPi}
              </span>
            </li>
          );
        })}
      </ul>
      {extra > 0 && <p className="mt-1 text-[10px] text-muted">+{extra} more</p>}
    </div>
  );
}

function OpenBuildSummary({event}: {event: ForzaEvent}) {
  const maxClass = piToClass(event.maxPi);
  const label = event.additionalCarRestrictions?.trim() || 'Open build';

  return (
    <div className="shrink-0 text-left">
      <ul className="flex flex-col gap-1">
        <li className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2.5 text-[10px] leading-tight">
          <span className="truncate font-medium text-slate-200">{label}</span>
          <span
            className={cn(
              'text-right font-bold tabular-nums',
              classColor[maxClass] ?? 'text-muted',
            )}
          >
            {maxClass} {event.maxPi}
          </span>
        </li>
      </ul>
    </div>
  );
}

export function EventCard({event}: Props) {
  const when = format(new Date(event.startsAt), 'EEE d MMM · HH:mm');
  const ended = event.status === 'ended';
  const full = !ended && (event.status === 'full' || event.currentPlayers >= event.maxPlayers);
  const {user} = useAuth();
  const isHost = event.hostDiscordId === user.discordId;

  return (
    <article className="group relative animate-fade-in">
      <Link to={`/event/${event.id}`} className="block">
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border border-white/[0.08] transition-all duration-200',
            ended
              ? 'border-white/[0.05] grayscale opacity-70 hover:opacity-80'
              : 'hover:border-white/[0.12]',
          )}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{backgroundImage: `url(${event.coverImageUrl})`}}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-base/80 via-base/70 to-base/60" />
          <div className="absolute inset-0 bg-black/25 transition-colors duration-200 group-hover:bg-black/20" />

          <div className="relative flex items-center gap-3 px-4 py-3 pb-3.5">
            <div className="min-w-0 flex-1 text-left">
              <h2 className="truncate text-sm font-semibold text-white">{event.title}</h2>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {event.hostUsername}
                {isHost && (
                  <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-accent-purple-light">
                    · You
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">{when}</p>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                <Users className="h-3 w-3 shrink-0" />
                {formatLobbyCount(event.currentPlayers)}
                {ended && (
                  <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-muted">
                    · Ended
                  </span>
                )}
                {full && (
                  <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-amber-300/90">
                    · Full
                  </span>
                )}
              </p>
            </div>

            {event.carRuleMode === 'restricted_list' && event.allowedCars.length > 0 && <CarList cars={event.allowedCars} />}
            {event.carRuleMode === 'anything_goes' && <OpenBuildSummary event={event} />}
          </div>

          {/* Type accent — bottom strip */}
          <div className={cn('absolute inset-x-0 bottom-0 h-[2px]', typeAccentBar[event.type])} />
        </div>
      </Link>
    </article>
  );
}

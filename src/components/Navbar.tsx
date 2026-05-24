import {NavLink} from 'react-router-dom';
import {CalendarDays, Compass, PlusCircle, User2} from 'lucide-react';
import {isStandaloneBrowser} from '../lib/discord';
import {useAuth} from '../context/AuthContext';
import {cn} from '../lib/cn';

export function Navbar() {
  const {user, isMockMode} = useAuth();
  const standalone = isStandaloneBrowser() || isMockMode;
  const initial = user.username.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 -mx-3 sm:-mx-5 md:-mx-8 lg:-mx-10">
      {/* Brand bar */}
      <div className="glass flex items-center justify-between gap-3 border-b border-white/[0.07] bg-base/85 px-4 py-3">
        <span className="select-none text-[13px] font-black tracking-tight text-white">
          FORZA
          <span className="bg-gradient-to-r from-accent-purple to-accent-purple-light bg-clip-text text-transparent">
            .EVENTS
          </span>
        </span>

        <div className="flex items-center gap-2.5">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
            </span>
            <span className="hidden text-[10px] font-medium tracking-wide text-muted-light sm:block">
              {standalone ? 'PREVIEW' : 'DISCORD'}
            </span>
          </div>

          {/* Avatar */}
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple-dark to-accent-purple-light text-[11px] font-bold text-white"
            style={{boxShadow: '0 0 0 2px rgba(139,92,246,0.25)'}}
          >
            {initial}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="glass flex border-b border-white/[0.07] bg-surface/75">
        {[
          {to: '/', end: true, icon: Compass, label: 'Browse'},
          {to: '/my-events', end: true, icon: CalendarDays, label: 'My Events'},
          {to: '/create', end: false, icon: PlusCircle, label: 'Create'},
          {to: '/profile', end: false, icon: User2, label: 'Profile'},
        ].map(({to, end, icon: Icon, label}) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({isActive}) =>
              cn(
                'group relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-all duration-200',
                isActive ? 'text-accent-purple-light' : 'text-muted hover:text-slate-300',
              )
            }
          >
            {({isActive}) => (
              <>
                {isActive && (
                  <span className="absolute inset-x-0 top-0 h-[2px] rounded-b-full bg-gradient-to-r from-accent-purple-dark via-accent-purple to-accent-purple-light opacity-90" />
                )}
                <Icon
                  className={cn(
                    'h-4 w-4 transition-all duration-200',
                    isActive && '[filter:drop-shadow(0_0_8px_rgba(139,92,246,0.9))]',
                  )}
                />
                <span className={isActive ? 'text-glow-purple' : ''}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

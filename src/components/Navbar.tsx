import {NavLink} from 'react-router-dom';
import {CalendarDays, Compass, PlusCircle, User2, type LucideIcon} from 'lucide-react';
import {AuthStatusIndicator} from './AuthStatusIndicator';
import {cn} from '../lib/cn';

const NAV_ITEMS: {to: string; end: boolean; icon: LucideIcon; label: string}[] = [
  {to: '/', end: true, icon: Compass, label: 'Browse'},
  {to: '/my-events', end: true, icon: CalendarDays, label: 'My Events'},
  {to: '/create', end: false, icon: PlusCircle, label: 'Create'},
  {to: '/profile', end: false, icon: User2, label: 'Profile'},
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <picture>
        <source srcSet="/logo/logo.webp 1x, /logo/logo@2x.webp 2x" type="image/webp" />
        <img
          src="/logo/logo.png"
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 shrink-0 translate-y-px object-contain"
          decoding="async"
        />
      </picture>
      <span
        className="inline-block origin-left -skew-x-[8deg] select-none text-[13px] font-black tracking-tight text-white"
        aria-label="FORZA.EVENTS"
      >
        FORZA
        <span className="bg-gradient-to-r from-accent-purple to-accent-purple-light bg-clip-text text-transparent">
          .EVENTS
        </span>
      </span>
    </div>
  );
}

function NavItem({
  to,
  end,
  icon: Icon,
  label,
  layout,
}: (typeof NAV_ITEMS)[number] & {layout: 'top' | 'side'}) {
  const isSide = layout === 'side';

  return (
    <NavLink
      to={to}
      end={end}
      className={({isActive}) =>
        cn(
          'group relative transition-all duration-200',
          isSide
            ? cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest',
                isActive
                  ? 'bg-white/[0.06] text-accent-purple-light'
                  : 'text-muted hover:bg-white/[0.03] hover:text-slate-300',
              )
            : cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-widest',
                isActive ? 'text-accent-purple-light' : 'text-muted hover:text-slate-300',
              ),
        )
      }
    >
      {({isActive}) => (
        <>
          {isActive && !isSide && (
            <span className="absolute inset-x-0 top-0 h-[2px] rounded-b-full bg-gradient-to-r from-accent-purple-dark via-accent-purple to-accent-purple-light opacity-90" />
          )}
          {isActive && isSide && (
            <span className="absolute inset-y-2 left-0 w-[2px] rounded-r-full bg-gradient-to-b from-accent-purple-dark via-accent-purple to-accent-purple-light opacity-90" />
          )}
          <Icon
            className={cn(
              'shrink-0 transition-all duration-200',
              isSide ? 'h-[18px] w-[18px]' : 'h-4 w-4',
              isActive && '[filter:drop-shadow(0_0_8px_rgba(139,92,246,0.9))]',
            )}
          />
          <span className={isActive ? 'text-glow-purple' : ''}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function NavbarTop() {
  return (
    <header className="sticky top-0 z-20 lg:hidden">
      <div className="glass flex items-center justify-between gap-3 border-b border-white/[0.07] bg-base/85 px-4 py-3">
        <BrandMark />
        <AuthStatusIndicator />
      </div>

      <nav className="glass flex border-b border-white/[0.07] bg-surface/75">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} layout="top" />
        ))}
      </nav>
    </header>
  );
}

function NavbarSide() {
  return (
    <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-[var(--app-sidebar-width)] flex-col border-r border-white/[0.07] bg-surface/80 lg:flex">
      <div className="border-b border-white/[0.07] px-4 py-5">
        <BrandMark />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} layout="side" />
        ))}
      </nav>

      <div className="border-t border-white/[0.07] px-4 py-4">
        <AuthStatusIndicator />
      </div>
    </aside>
  );
}

export function Navbar() {
  return (
    <>
      <NavbarTop />
      <NavbarSide />
    </>
  );
}

import {NavLink} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {CalendarDays, Compass, PlusCircle, User2, type LucideIcon} from 'lucide-react';
import {AuthStatusIndicator} from './AuthStatusIndicator';
import {Logo} from './ui/Logo';
import {navShellBorderClass} from './ui/formStyles';
import {cn} from '../lib/cn';

const navBrandBarClass = cn(
  'glass border-b bg-base/85',
  navShellBorderClass,
);

const NAV_ITEMS: {to: string; end: boolean; icon: LucideIcon; labelKey: string}[] = [
  {to: '/', end: true, icon: Compass, labelKey: 'nav.browse'},
  {to: '/my-events', end: true, icon: CalendarDays, labelKey: 'nav.myEvents'},
  {to: '/create', end: false, icon: PlusCircle, labelKey: 'nav.create'},
  {to: '/profile', end: false, icon: User2, labelKey: 'nav.profile'},
];

function NavItem({
  to,
  end,
  icon: Icon,
  labelKey,
  layout,
}: (typeof NAV_ITEMS)[number] & {layout: 'top' | 'side'}) {
  const {t} = useTranslation();
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
          <span className={isActive ? 'text-glow-purple' : ''}>{t(labelKey)}</span>
        </>
      )}
    </NavLink>
  );
}

function NavbarTop() {
  return (
    <header className="sticky top-0 z-20 lg:hidden">
      <div
        className={cn(
          navBrandBarClass,
          'flex items-center justify-between gap-3 px-4 py-3',
        )}
      >
        <Logo size="nav" />
        <AuthStatusIndicator />
      </div>

      <nav className={cn('glass flex border-b bg-surface/75', navShellBorderClass)}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} layout="top" />
        ))}
      </nav>
    </header>
  );
}

function NavbarSide() {
  return (
    <aside
      className={cn(
        'glass fixed inset-y-0 left-0 z-30 hidden w-[var(--app-sidebar-width)] flex-col border-r bg-surface/80 lg:flex',
        navShellBorderClass,
      )}
    >
      <div className={cn(navBrandBarClass, 'px-4 py-5')}>
        <Logo size="nav" />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} layout="side" />
        ))}
      </nav>

      <div className={cn('border-t px-4 py-4', navShellBorderClass)}>
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

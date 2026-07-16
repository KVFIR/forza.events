import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {Logo} from './Logo';
import {Spinner} from './Spinner';

type Props = {
  label?: string;
  className?: string;
  /** Show spinner under the logo (default true). */
  spinner?: boolean;
  children?: ReactNode;
  /** Mirrors Discord Activity layout attribute used by CSS. */
  'data-discord-layout'?: string;
};

/** Full-viewport boot / gate loading — keep in sync with `#boot-splash` in index.html. */
export function AppBootScreen({
  label,
  className,
  spinner = true,
  children,
  'data-discord-layout': discordLayout,
}: Props) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...(discordLayout ? {'data-discord-layout': discordLayout} : {})}
    >
      <Logo size="lg" />
      {spinner ? <Spinner size="lg" muted /> : null}
      {label ? <p className="text-sm text-muted">{label}</p> : null}
      {children}
    </div>
  );
}

import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Fade in when content replaces loading — no vertical motion (EventCard keeps its own cover fade). */
export function ContentReveal({children, className}: Props) {
  return (
    <div className={cn('animate-content-reveal motion-reduce:animate-none', className)}>
      {children}
    </div>
  );
}

import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Smooth fade/slide when content replaces loading or mounts. */
export function ContentReveal({children, className}: Props) {
  return <div className={cn('animate-content-in', className)}>{children}</div>;
}

import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {emptyDashedClass} from './formStyles';

type Props = {
  children: ReactNode;
  className?: string;
};

export function EmptyPlaceholder({children, className}: Props) {
  return <p className={cn(emptyDashedClass, className)}>{children}</p>;
}

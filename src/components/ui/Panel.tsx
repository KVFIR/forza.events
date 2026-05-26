import type {HTMLAttributes, ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {panelClass, panelDividedClass, panelSoftClass} from './formStyles';

export type PanelVariant = 'default' | 'soft';

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: PanelVariant;
  divided?: boolean;
  children: ReactNode;
};

const variantClass: Record<PanelVariant, string> = {
  default: panelClass,
  soft: panelSoftClass,
};

export function Panel({
  variant = 'default',
  divided = false,
  className,
  children,
  ...props
}: Props) {
  return (
    <div
      className={cn(variantClass[variant], divided && panelDividedClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}

import type {HTMLAttributes, ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {modalOverlayClass, modalPanelClass} from './buttonStyles';

type ModalBackdropProps = {
  children: ReactNode;
  onBackdropClick?: () => void;
};

export function ModalBackdrop({children, onBackdropClick}: ModalBackdropProps) {
  return (
    <div className={modalOverlayClass} role="presentation" onClick={onBackdropClick}>
      {children}
    </div>
  );
}

export function ModalPanel({className, children, ...props}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(modalPanelClass, className)}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

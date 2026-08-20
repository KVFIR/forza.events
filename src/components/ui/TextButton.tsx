import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {Link, type LinkProps} from 'react-router-dom';
import {cn} from '../../lib/cn';

export type TextButtonTone = 'action' | 'nav' | 'emphasis' | 'subtle';

const toneClass: Record<TextButtonTone, string> = {
  action:
    'text-xs font-medium text-slate-200 transition-colors hover:text-white',
  nav: 'text-xs font-semibold uppercase tracking-widest text-muted transition-colors hover:text-accent-purple-light',
  emphasis:
    'text-sm font-medium text-slate-200 transition-colors hover:text-white',
  subtle: 'text-xs font-medium text-muted transition-colors hover:text-slate-200',
};

type TextButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: TextButtonTone;
  children: ReactNode;
};

export function TextButton({
  tone = 'action',
  className,
  type = 'button',
  children,
  ...props
}: TextButtonProps) {
  return (
    <button type={type} className={cn(toneClass[tone], className)} {...props}>
      {children}
    </button>
  );
}

type TextLinkProps = LinkProps & {
  tone?: TextButtonTone;
  children: ReactNode;
};

export function TextLink({tone = 'action', className, children, ...props}: TextLinkProps) {
  return (
    <Link className={cn(toneClass[tone], className)} {...props}>
      {children}
    </Link>
  );
}

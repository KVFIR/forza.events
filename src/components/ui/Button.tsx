import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {buttonBaseClass, buttonSizeClass, type ButtonSize} from './buttonStyles';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'open'
  | 'leave'
  | 'full';

const variants: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-r from-accent-purple-dark to-accent-purple',
    'text-white font-semibold',
    'shadow-glow-purple-sm hover:shadow-glow-purple',
    'hover:from-accent-purple hover:to-accent-purple-light',
    'active:scale-[0.97]',
    'disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none',
  ].join(' '),
  secondary: [
    'border border-white/10 bg-white/[0.05]',
    'text-slate-200 font-medium',
    'hover:border-accent-purple/35 hover:bg-white/[0.08] hover:text-white',
    'active:scale-[0.97]',
    'disabled:opacity-40 disabled:pointer-events-none',
  ].join(' '),
  ghost: [
    'text-muted-light font-medium',
    'hover:bg-white/[0.05] hover:text-slate-200',
    'active:scale-[0.97]',
  ].join(' '),
  danger: [
    'bg-gradient-to-r from-red-900/80 to-red-800/80',
    'border border-red-700/30',
    'text-red-200 font-semibold',
    'hover:from-red-800 hover:to-red-700 hover:text-white',
    'active:scale-[0.97]',
    'disabled:opacity-40 disabled:pointer-events-none',
  ].join(' '),
  success: [
    'bg-gradient-to-r from-emerald-800 to-accent-green',
    'text-white font-semibold',
    'shadow-glow-green hover:brightness-110',
    'active:scale-[0.97]',
    'disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none',
  ].join(' '),
  open: [
    'border border-accent-green/30 bg-accent-green/10 text-accent-green',
    'hover:bg-accent-green/15 hover:border-accent-green/40',
    'active:scale-[0.97]',
    'disabled:opacity-40 disabled:pointer-events-none',
  ].join(' '),
  leave: [
    'border border-rose-500/30 bg-rose-500/10 text-rose-300',
    'hover:bg-rose-500/15 hover:border-rose-500/45',
    'active:scale-[0.97]',
    'disabled:opacity-40 disabled:pointer-events-none',
  ].join(' '),
  full: [
    'border border-amber-500/30 bg-amber-500/10 text-amber-300',
    'active:scale-[0.97]',
    'disabled:opacity-40 disabled:pointer-events-none',
  ].join(' '),
};

const CHIP_VARIANTS = new Set<ButtonVariant>(['open', 'leave', 'full']);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size,
  fullWidth = false,
  className,
  children,
  type = 'button',
  ...props
}: Props) {
  const resolvedSize = size ?? (CHIP_VARIANTS.has(variant) ? 'chip' : 'default');

  return (
    <button
      type={type}
      className={cn(
        buttonBaseClass,
        buttonSizeClass[resolvedSize],
        variants[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

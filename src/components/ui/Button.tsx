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

/** Soft = bordered glass (pages). Solid = filled gradient (modals only). */
export type ButtonEmphasis = 'soft' | 'solid';

const CHIP_VARIANTS = new Set<ButtonVariant>(['open', 'leave', 'full']);

const sharedDisabled =
  'disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]';

const softVariants: Record<ButtonVariant, string> = {
  primary: [
    'border border-accent-purple/35 bg-accent-purple/10',
    'text-accent-purple-light font-semibold',
    'hover:border-accent-purple/50 hover:bg-accent-purple/15 hover:text-white',
    sharedDisabled,
  ].join(' '),
  secondary: [
    'border border-white/10 bg-white/[0.05]',
    'text-slate-200 font-medium',
    'hover:border-accent-purple/35 hover:bg-white/[0.08] hover:text-white',
    sharedDisabled,
  ].join(' '),
  ghost: [
    'text-muted-light font-medium',
    'hover:bg-white/[0.05] hover:text-slate-200',
    'disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]',
  ].join(' '),
  danger: [
    'border border-rose-500/35 bg-rose-500/10',
    'text-rose-300 font-semibold',
    'hover:border-rose-500/50 hover:bg-rose-500/15 hover:text-rose-200',
    sharedDisabled,
  ].join(' '),
  success: [
    'border border-accent-green/35 bg-accent-green/10',
    'text-accent-green font-semibold',
    'hover:border-accent-green/50 hover:bg-accent-green/15',
    sharedDisabled,
  ].join(' '),
  open: [
    'border border-accent-green/30 bg-accent-green/10 text-accent-green',
    'hover:bg-accent-green/15 hover:border-accent-green/40',
    sharedDisabled,
  ].join(' '),
  leave: [
    'border border-rose-500/30 bg-rose-500/10 text-rose-300',
    'hover:bg-rose-500/15 hover:border-rose-500/45',
    sharedDisabled,
  ].join(' '),
  full: [
    'border border-amber-500/30 bg-amber-500/10 text-amber-300',
    sharedDisabled,
  ].join(' '),
};

const solidVariants: Partial<Record<ButtonVariant, string>> = {
  primary: [
    'bg-gradient-to-r from-accent-purple-dark to-accent-purple',
    'text-white font-semibold',
    'shadow-glow-purple-sm hover:shadow-glow-purple',
    'hover:from-accent-purple hover:to-accent-purple-light',
    'disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none active:scale-[0.97]',
  ].join(' '),
  danger: [
    'bg-gradient-to-r from-red-900/80 to-red-800/80',
    'border border-red-700/30',
    'text-red-200 font-semibold',
    'hover:from-red-800 hover:to-red-700 hover:text-white',
    'disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]',
  ].join(' '),
  success: [
    'bg-gradient-to-r from-emerald-800 to-accent-green',
    'text-white font-semibold',
    'shadow-glow-green hover:brightness-110',
    'disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none active:scale-[0.97]',
  ].join(' '),
};

function variantClass(variant: ButtonVariant, emphasis: ButtonEmphasis): string {
  if (CHIP_VARIANTS.has(variant)) return softVariants[variant];
  if (emphasis === 'solid' && solidVariants[variant]) return solidVariants[variant]!;
  return softVariants[variant];
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Use `solid` for modal primary/danger confirms; pages default to `soft`. */
  emphasis?: ButtonEmphasis;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  emphasis = 'soft',
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
        variantClass(variant, emphasis),
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

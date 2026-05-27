import {useState} from 'react';
import {cn} from '../lib/cn';

const SIZE_CLASS = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-xl',
} as const;

const VARIANT_CLASS = {
  purple: 'bg-gradient-to-br from-accent-purple-dark/60 to-accent-purple/60',
  green: 'bg-gradient-to-br from-accent-green/40 to-emerald-600/50',
  neutral: 'bg-white/10',
  profile: 'bg-gradient-to-br from-accent-purple-dark to-accent-purple-light shadow-glow-purple-sm',
} as const;

type Props = {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZE_CLASS;
  variant?: keyof typeof VARIANT_CLASS;
  className?: string;
};

export function UserAvatar({src, name, size = 'sm', variant = 'purple', className}: Props) {
  const [failed, setFailed] = useState(false);
  const initial = (name.trim().charAt(0) || '?').toUpperCase();
  const showImage = Boolean(src?.trim()) && !failed;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full',
        SIZE_CLASS[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center font-bold text-white',
            VARIANT_CLASS[variant],
          )}
          aria-hidden
        >
          {initial}
        </div>
      )}
    </div>
  );
}

import {cn} from '../../lib/cn';

/** Canonical brand lockup: mark + skewed FORZA.EVENTS wordmark (nav bar is the reference). */
export type LogoSize = 'sm' | 'lg';

const sizeConfig: Record<
  LogoSize,
  {gap: string; imgClass: string; imgPx: number; textClass: string}
> = {
  sm: {
    gap: 'gap-2',
    imgClass: 'h-6 w-6 translate-y-px',
    imgPx: 24,
    textClass: 'text-[13px]',
  },
  lg: {
    gap: 'gap-3',
    imgClass: 'h-10 w-10',
    imgPx: 40,
    textClass: 'text-lg',
  },
};

const wordmarkClass =
  'inline-block origin-left -skew-x-[10deg] font-black tracking-tight text-white select-none';

type Props = {
  size?: LogoSize;
  className?: string;
};

export function Logo({size = 'sm', className}: Props) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center', config.gap, className)}>
      <picture>
        <source srcSet="/logo/logo.webp 1x, /logo/logo@2x.webp 2x" type="image/webp" />
        <img
          src="/logo/logo.png"
          alt=""
          width={config.imgPx}
          height={config.imgPx}
          className={cn('shrink-0 object-contain', config.imgClass)}
          decoding="async"
        />
      </picture>
      <span className={cn(wordmarkClass, config.textClass)} aria-label="FORZA.EVENTS">
        FORZA
        <span className="bg-gradient-to-r from-accent-purple to-accent-purple-light bg-clip-text text-transparent">
          .EVENTS
        </span>
      </span>
    </div>
  );
}

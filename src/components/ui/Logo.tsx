import {cn} from '../../lib/cn';

export type LogoSize = 'nav' | 'wordmark' | 'hero';

const sizeConfig: Record<
  LogoSize,
  {showImage: boolean; imgClass: string; textClass: string; skew: boolean; gap: string}
> = {
  nav: {
    showImage: true,
    imgClass: 'h-6 w-6 translate-y-px',
    textClass: 'text-[13px]',
    skew: true,
    gap: 'gap-2',
  },
  wordmark: {
    showImage: false,
    imgClass: '',
    textClass: 'text-[13px]',
    skew: false,
    gap: '',
  },
  hero: {
    showImage: true,
    imgClass: 'h-10 w-10',
    textClass: 'text-lg',
    skew: true,
    gap: 'gap-3',
  },
};

type Props = {
  size?: LogoSize;
  className?: string;
};

export function Logo({size = 'nav', className}: Props) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center', config.gap, className)}>
      {config.showImage ? (
        <picture>
          <source srcSet="/logo/logo.webp 1x, /logo/logo@2x.webp 2x" type="image/webp" />
          <img
            src="/logo/logo.png"
            alt=""
            width={size === 'hero' ? 40 : 24}
            height={size === 'hero' ? 40 : 24}
            className={cn('shrink-0 object-contain', config.imgClass)}
            decoding="async"
          />
        </picture>
      ) : null}
      <span
        className={cn(
          'inline-block font-black tracking-tight text-white select-none',
          config.textClass,
          config.skew && 'origin-left -skew-x-[10deg]',
        )}
        aria-label="FORZA.EVENTS"
      >
        FORZA
        <span className="bg-gradient-to-r from-accent-purple to-accent-purple-light bg-clip-text text-transparent">
          .EVENTS
        </span>
      </span>
    </div>
  );
}

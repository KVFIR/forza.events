import {coverDisplayUrl, type CoverDisplayVariant} from '../lib/coverImage';
import {cn} from '../lib/cn';

type Props = {
  src: string;
  variant?: CoverDisplayVariant;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  alt?: string;
};

export function EventCover({
  src,
  variant = 'card',
  className,
  imgClassName,
  priority = false,
  alt = '',
}: Props) {
  const displaySrc = coverDisplayUrl(src, variant);
  const sizes =
    variant === 'hero'
      ? '(max-width: 672px) 100vw, 672px'
      : variant === 'preview'
        ? '100vw'
        : '(max-width: 672px) 100vw, 672px';

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        src={displaySrc}
        alt={alt}
        width={variant === 'card' ? 640 : 960}
        height={variant === 'card' ? 360 : 540}
        sizes={sizes}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={cn('h-full w-full object-cover object-center', imgClassName)}
      />
    </div>
  );
}

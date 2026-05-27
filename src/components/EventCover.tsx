import {useEffect} from 'react';
import {coverDisplaySize, coverDisplayUrl, type CoverDisplayVariant} from '../lib/coverImage';
import {useImageReady} from '../hooks/useImageReady';
import {cn} from '../lib/cn';

const COVER_IMG_FILL_CLASS =
  'absolute inset-0 block h-full w-full max-w-none object-cover object-center';

type Props = {
  src: string;
  variant?: CoverDisplayVariant;
  /** Fill a `position: relative` parent (hero band, event card). */
  fill?: boolean;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  alt?: string;
  onReady?: () => void;
};

export function EventCover({
  src,
  variant = 'card',
  fill = false,
  className,
  imgClassName,
  priority = false,
  alt = '',
  onReady,
}: Props) {
  const displaySrc = coverDisplayUrl(src, variant);
  const {width, height} = coverDisplaySize(variant);
  const {ready, onLoad, onError, imgRef} = useImageReady(displaySrc);

  useEffect(() => {
    if (ready) onReady?.();
  }, [ready, onReady]);

  const sizes =
    variant === 'hero'
      ? '(max-width: 672px) 100vw, 672px'
      : variant === 'preview'
        ? '100vw'
        : '(max-width: 672px) 100vw, 672px';

  const img = (
    <img
      ref={imgRef}
      src={displaySrc}
      alt={alt}
      sizes={sizes}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      {...(priority ? {fetchpriority: 'high'} : {fetchpriority: 'auto'})}
      onLoad={onLoad}
      onError={onError}
      className={cn(fill ? COVER_IMG_FILL_CLASS : 'h-full w-full max-w-none object-cover object-center', imgClassName)}
      {...(fill ? {} : {width, height})}
    />
  );

  if (fill) {
    return img;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {img}
    </div>
  );
}

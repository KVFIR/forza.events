import {useEffect} from 'react';
import {coverDisplayUrl, type CoverDisplayVariant} from '../lib/coverImage';
import {useImageReady} from '../hooks/useImageReady';
import {cn} from '../lib/cn';

type Props = {
  src: string;
  variant?: CoverDisplayVariant;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  alt?: string;
  onReady?: () => void;
};

export function EventCover({
  src,
  variant = 'card',
  className,
  imgClassName,
  priority = false,
  alt = '',
  onReady,
}: Props) {
  const displaySrc = coverDisplayUrl(src, variant);
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

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        width={variant === 'card' ? 640 : 960}
        height={variant === 'card' ? 360 : 540}
        sizes={sizes}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        {...(priority ? {fetchpriority: 'high'} : {fetchpriority: 'auto'})}
        onLoad={onLoad}
        onError={onError}
        className={cn('h-full w-full object-cover object-center', imgClassName)}
      />
    </div>
  );
}

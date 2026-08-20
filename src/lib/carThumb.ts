import type {ForzaGame} from './eventGames';

export type CarThumbParts = {
  make: string;
  model: string;
  year?: number | null;
  pi: number;
};

export const CAR_THUMB_NULL = '/cars/null.webp';

/** Catalog title used in thumb filenames — keep in sync with `formatCarFullName`. */
function carTitle(car: Pick<CarThumbParts, 'make' | 'model'>): string {
  const model = String(car.model ?? '')
    .replace(/\s*\(([12][0-9]{3})\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const make = String(car.make ?? '').trim();
  if (!make || !model) return model || make;
  if (model.toLowerCase().startsWith(make.toLowerCase())) return model;
  return `${make} ${model}`;
}

/** Keep in sync with `scripts/download-car-thumbs.mjs`. */
export function carThumbFileName(car: CarThumbParts): string {
  const slug = carTitle(car)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const year =
    car.year == null || !Number.isFinite(Number(car.year))
      ? 'x'
      : String(Math.trunc(Number(car.year)));
  return `${slug}_${year}_${Math.trunc(Number(car.pi))}.webp`;
}

export function carThumbUrl(car: CarThumbParts, game: ForzaGame): string {
  return `/cars/${game}/${carThumbFileName(car)}`;
}

/** Missing file → bundled Null Car; Null Car miss → hide. */
export function handleCarThumbError(event: {currentTarget: HTMLImageElement}): void {
  const img = event.currentTarget;
  if (img.dataset.thumbFallback === '1') {
    img.hidden = true;
    return;
  }
  img.dataset.thumbFallback = '1';
  img.src = CAR_THUMB_NULL;
}

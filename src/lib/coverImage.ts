import {
  DISCORD_SUPABASE_PROXY_PREFIX,
  isDiscordActivityFrame,
  resolveSupabaseUrl,
} from './supabaseEnv';

/** Standard event cover aspect (16:9) — cards, detail hero, Discord embed image. */
export const COVER_ASPECT_WIDTH = 16;
export const COVER_ASPECT_HEIGHT = 9;
export const COVER_ASPECT_RATIO = COVER_ASPECT_WIDTH / COVER_ASPECT_HEIGHT;

/** Encoded upload size (center-cropped to {@link COVER_ASPECT_RATIO}). */
export const COVER_UPLOAD_MAX_WIDTH = 1280;
export const COVER_UPLOAD_MAX_HEIGHT = 720;
export const COVER_UPLOAD_QUALITY = 0.82;

/** Tailwind class matching {@link COVER_ASPECT_RATIO}. */
export const COVER_ASPECT_CLASS = 'aspect-video';

/** Full-bleed inside `.app-main-column` — see `.cover-page-bleed` in `index.css`. */
export const COVER_PAGE_BLEED_CLASS = 'cover-page-bleed';

/**
 * Event detail hero height (full width). Do not pair with `aspect-video` + `max-h-*` —
 * that shrinks width and left-aligns the band.
 */
export const COVER_HERO_BAND_CLASS = 'h-44 sm:h-52';

export type CoverDisplayVariant = 'card' | 'hero' | 'preview';

const DISPLAY_SIZE: Record<CoverDisplayVariant, {width: number; height: number}> = {
  card: {width: 640, height: 360},
  hero: {width: 960, height: 540},
  preview: {width: 1280, height: 720},
};

const SUPABASE_OBJECT = '/storage/v1/object/public/';
const SUPABASE_RENDER = '/storage/v1/render/image/public/';

/**
 * Discord Activity CSP allows img-src 'self' and Discord CDNs only — not *.supabase.co.
 * Route Storage through the Activity URL mapping prefix (same as API proxy).
 */
function discordProxiedStorageUrl(url: string): string {
  if (!isDiscordActivityFrame()) return url;
  const projectBase = resolveSupabaseUrl();
  if (!projectBase) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  let projectHost: string;
  try {
    projectHost = new URL(projectBase).host;
  } catch {
    return url;
  }
  if (parsed.host !== projectHost) return url;
  return `${DISCORD_SUPABASE_PROXY_PREFIX}${parsed.pathname}${parsed.search}`;
}

/** Center-crop source rect to the target aspect ratio. */
export function coverCropSourceRect(
  naturalWidth: number,
  naturalHeight: number,
  targetAspect: number = COVER_ASPECT_RATIO,
): {sx: number; sy: number; sw: number; sh: number} {
  if (naturalWidth < 1 || naturalHeight < 1) {
    return {sx: 0, sy: 0, sw: Math.max(1, naturalWidth), sh: Math.max(1, naturalHeight)};
  }
  const srcAspect = naturalWidth / naturalHeight;
  if (srcAspect > targetAspect) {
    const sw = Math.round(naturalHeight * targetAspect);
    return {
      sx: Math.round((naturalWidth - sw) / 2),
      sy: 0,
      sw,
      sh: naturalHeight,
    };
  }
  if (srcAspect < targetAspect) {
    const sh = Math.round(naturalWidth / targetAspect);
    return {
      sx: 0,
      sy: Math.round((naturalHeight - sh) / 2),
      sw: naturalWidth,
      sh,
    };
  }
  return {sx: 0, sy: 0, sw: naturalWidth, sh: naturalHeight};
}

export function coverDisplaySize(variant: CoverDisplayVariant = 'card'): {
  width: number;
  height: number;
} {
  return DISPLAY_SIZE[variant];
}

/** Resize Supabase Storage URLs via the image renderer; pass through other URLs unchanged. */
export function coverDisplayUrl(src: string, variant: CoverDisplayVariant = 'card'): string {
  const trimmed = src.trim();
  if (!trimmed) return trimmed;

  const {width, height} = DISPLAY_SIZE[variant];
  const idx = trimmed.indexOf(SUPABASE_OBJECT);
  let display = trimmed;
  if (idx !== -1) {
    const renderBase =
      trimmed.slice(0, idx) + SUPABASE_RENDER + trimmed.slice(idx + SUPABASE_OBJECT.length);
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      quality: variant === 'hero' ? '85' : '80',
      resize: 'cover',
    });
    display = `${renderBase}?${params}`;
  }

  return discordProxiedStorageUrl(display);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file.'));
    };
    img.src = url;
  });
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image.'))),
      type,
      quality,
    );
  });
}

/** Center-crop to 16:9, resize, and re-encode cover uploads before storage (WebP when supported). */
export async function compressCoverForUpload(file: File): Promise<File> {
  const img = await loadImageElement(file);
  const {sx, sy, sw, sh} = coverCropSourceRect(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(
    1,
    COVER_UPLOAD_MAX_WIDTH / sw,
    COVER_UPLOAD_MAX_HEIGHT / sh,
  );
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'cover';
  try {
    const webp = await encodeCanvas(canvas, 'image/webp', COVER_UPLOAD_QUALITY);
    return new File([webp], `${baseName}.webp`, {type: 'image/webp'});
  } catch {
    const jpeg = await encodeCanvas(canvas, 'image/jpeg', COVER_UPLOAD_QUALITY);
    return new File([jpeg], `${baseName}.jpg`, {type: 'image/jpeg'});
  }
}

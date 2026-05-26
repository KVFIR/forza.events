import {
  DISCORD_SUPABASE_PROXY_PREFIX,
  isDiscordActivityFrame,
  resolveSupabaseUrl,
} from './supabaseEnv';

/** Max width for uploaded covers (16:9-ish cards and Discord embeds). */
export const COVER_UPLOAD_MAX_WIDTH = 1280;
export const COVER_UPLOAD_MAX_HEIGHT = 720;
export const COVER_UPLOAD_QUALITY = 0.82;

export type CoverDisplayVariant = 'card' | 'hero' | 'preview';

const DISPLAY_WIDTH: Record<CoverDisplayVariant, number> = {
  card: 640,
  hero: 960,
  preview: 1280,
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

/** Resize Supabase Storage URLs via the image renderer; pass through other URLs unchanged. */
export function coverDisplayUrl(src: string, variant: CoverDisplayVariant = 'card'): string {
  const trimmed = src.trim();
  if (!trimmed) return trimmed;

  const width = DISPLAY_WIDTH[variant];
  const idx = trimmed.indexOf(SUPABASE_OBJECT);
  let display = trimmed;
  if (idx !== -1) {
    const renderBase =
      trimmed.slice(0, idx) + SUPABASE_RENDER + trimmed.slice(idx + SUPABASE_OBJECT.length);
    const params = new URLSearchParams({
      width: String(width),
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

/** Resize and re-encode cover uploads before storage (WebP when supported). */
export async function compressCoverForUpload(file: File): Promise<File> {
  const img = await loadImageElement(file);
  const scale = Math.min(
    1,
    COVER_UPLOAD_MAX_WIDTH / img.naturalWidth,
    COVER_UPLOAD_MAX_HEIGHT / img.naturalHeight,
  );
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(img, 0, 0, width, height);

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'cover';
  try {
    const webp = await encodeCanvas(canvas, 'image/webp', COVER_UPLOAD_QUALITY);
    return new File([webp], `${baseName}.webp`, {type: 'image/webp'});
  } catch {
    const jpeg = await encodeCanvas(canvas, 'image/jpeg', COVER_UPLOAD_QUALITY);
    return new File([jpeg], `${baseName}.jpg`, {type: 'image/jpeg'});
  }
}

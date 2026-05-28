/** Contact for privacy / data requests (override via VITE_LEGAL_CONTACT_EMAIL). */
export function getLegalContactEmail(): string {
  const fromEnv = import.meta.env.VITE_LEGAL_CONTACT_EMAIL as string | undefined;
  const trimmed = fromEnv?.trim();
  return trimmed && trimmed.includes('@') ? trimmed : 'rudolfs@oas.lv';
}

export function getServiceOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_APP_ORIGIN as string | undefined;
  return fromEnv?.trim().replace(/\/$/, '') || 'https://forza.events';
}

/** Contact for privacy / data requests (override via VITE_LEGAL_CONTACT_EMAIL). */
export function getLegalContactEmail(): string {
  const fromEnv = import.meta.env.VITE_LEGAL_CONTACT_EMAIL as string | undefined;
  const trimmed = fromEnv?.trim();
  return trimmed && trimmed.includes('@') ? trimmed : 'rudolfs@oas.lv';
}

const DEFAULT_OPERATOR_NAME = 'Rūdolfs Jefremovs';

/** Legal name of the data controller (VITE_LEGAL_OPERATOR_NAME or default). */
export function getLegalOperatorName(): string {
  const fromEnv = import.meta.env.VITE_LEGAL_OPERATOR_NAME as string | undefined;
  const trimmed = fromEnv?.trim();
  return trimmed || DEFAULT_OPERATOR_NAME;
}

/** GDPR Art. 13(1)(a) — identity and contact details of the controller. */
export function getLegalControllerDescription(): string {
  const email = getLegalContactEmail();
  const name = getLegalOperatorName();
  return (
    `Data controller: ${name}, an individual (natural person) residing in the Republic of Latvia, ` +
    `who operates the FORZA.EVENTS service. Contact: ${email}.`
  );
}

export function getServiceOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_APP_ORIGIN as string | undefined;
  return fromEnv?.trim().replace(/\/$/, '') || 'https://forzaevents.up.railway.app';
}

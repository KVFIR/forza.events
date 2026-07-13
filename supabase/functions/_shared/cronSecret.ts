/** Shared cron auth for scheduled Edge invocations (same secret as process-notifications). */
export function cronSecretConfiguredOk(
  provided: string | null,
  expected: string | undefined,
  allowInsecure: boolean,
): boolean {
  const secret = expected?.trim();
  if (secret) {
    const raw = provided?.trim();
    return Boolean(raw && raw === secret);
  }
  return allowInsecure;
}

export function cronSecretOk(req: Request): boolean {
  const secret = Deno.env.get('NOTIFICATION_CRON_SECRET')?.trim() || undefined;
  const allowInsecure = Deno.env.get('ALLOW_INSECURE_NOTIFICATION_CRON') === 'true';
  if (!secret?.trim() && !allowInsecure) {
    console.error(
      JSON.stringify({msg: 'NOTIFICATION_CRON_SECRET not set — cron calls rejected'}),
    );
    return false;
  }
  if (!secret?.trim() && allowInsecure) {
    console.warn(
      JSON.stringify({msg: 'cron endpoint running without NOTIFICATION_CRON_SECRET'}),
    );
    return true;
  }
  return cronSecretConfiguredOk(req.headers.get('x-cron-secret'), secret, allowInsecure);
}

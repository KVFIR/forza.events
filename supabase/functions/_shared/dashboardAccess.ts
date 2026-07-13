const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export const ANALYTICS_DASHBOARD_SECRET_HEADER = 'x-analytics-dashboard-secret';

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

/** Edge: allow dashboard API only from a localhost browser Origin (no IP-header trust). */
export function isLocalDashboardRequest(req: Request): boolean {
  const origin = req.headers.get('Origin');
  if (!origin) return false;
  try {
    return isLocalHostname(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function dashboardSecretMatches(
  provided: string | null,
  expected: string | undefined,
): boolean {
  const secret = expected?.trim();
  if (!secret) return false;
  const raw = provided?.trim();
  return Boolean(raw && raw === secret);
}

export function dashboardSecretOk(req: Request): boolean {
  return dashboardSecretMatches(
    req.headers.get(ANALYTICS_DASHBOARD_SECRET_HEADER),
    Deno.env.get('ANALYTICS_DASHBOARD_SECRET') ?? undefined,
  );
}

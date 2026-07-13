import {describe, expect, it} from 'vitest';
import {
  dashboardSecretMatches,
  isLocalDashboardRequest,
} from '../supabase/functions/_shared/dashboardAccess.ts';

describe('dashboardAccess', () => {
  it('allows localhost origin', () => {
    const req = new Request('https://example.com', {
      headers: {Origin: 'http://localhost:5180'},
    });
    expect(isLocalDashboardRequest(req)).toBe(true);
  });

  it('rejects production origin', () => {
    const req = new Request('https://example.com', {
      headers: {Origin: 'https://forza.events'},
    });
    expect(isLocalDashboardRequest(req)).toBe(false);
  });

  it('rejects missing origin even with loopback IP headers', () => {
    const req = new Request('https://example.com', {
      headers: {'x-forwarded-for': '127.0.0.1'},
    });
    expect(isLocalDashboardRequest(req)).toBe(false);
  });

  it('requires matching dashboard secret', () => {
    expect(dashboardSecretMatches('test-secret', 'test-secret')).toBe(true);
    expect(dashboardSecretMatches('wrong', 'test-secret')).toBe(false);
    expect(dashboardSecretMatches('x', undefined)).toBe(false);
  });
});

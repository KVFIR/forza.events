import {describe, expect, it, vi, afterEach} from 'vitest';
import {isLocalAnalyticsDashboardPath} from '../src/lib/localAnalyticsDashboard';

describe('localAnalyticsDashboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('matches /analytics on localhost only', () => {
    const win = {
      location: {hostname: 'localhost', pathname: '/analytics'},
      parent: null as unknown,
    };
    win.parent = win;
    vi.stubGlobal('window', win);
    expect(isLocalAnalyticsDashboardPath()).toBe(true);
    expect(isLocalAnalyticsDashboardPath('/analytics/')).toBe(true);
  });

  it('blocks /analytics on production host', () => {
    const win = {
      location: {hostname: 'forza.events', pathname: '/analytics'},
      parent: null as unknown,
    };
    win.parent = win;
    vi.stubGlobal('window', win);
    expect(isLocalAnalyticsDashboardPath()).toBe(false);
  });
});

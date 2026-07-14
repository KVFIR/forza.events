import {describe, expect, it} from 'vitest';
import {
  apiErrorWatchStatus,
  buildWatchItems,
  conversionWatchStatus,
  healthWatchSummary,
} from '../src/lib/analyticsHealthWatch';
import type {AnalyticsDashboardSummary} from '../src/lib/analyticsDashboard';

function emptySummary(days = 7): AnalyticsDashboardSummary {
  return {
    days,
    since: new Date().toISOString(),
    total_events: 0,
    unique_users: 0,
    sessions: 0,
    by_surface: {},
    unique_users_by_surface: {},
    sessions_by_surface: {},
    funnel: {},
    funnel_by_surface: {},
    conversion: {
      auth: {success: 0, failed: 0, rate: null},
      join: {success: 0, failed: 0, rate: null},
      publish: {success: 0, failed: 0, rate: null},
      event_views_per_session: {sessions: 0, event_views: 0, avg: null},
    },
    host_actions: {},
    top_errors: [],
    errors_by_surface: {},
    errors_by_function: {},
    recent_errors: [],
    daily: [],
  };
}

describe('analyticsHealthWatch', () => {
  it('flags join conversion failures', () => {
    expect(conversionWatchStatus({success: 7, failed: 3, rate: 70})).toBe('critical');
    expect(conversionWatchStatus({success: 19, failed: 1, rate: 95})).toBe('ok');
  });

  it('scales API error severity by window length', () => {
    expect(apiErrorWatchStatus(0, 7)).toBe('ok');
    expect(apiErrorWatchStatus(3, 7)).toBe('warn');
    expect(apiErrorWatchStatus(30, 7)).toBe('critical');
    expect(apiErrorWatchStatus(2, 1)).toBe('warn');
  });

  it('does not claim all clear when every signal is unknown', () => {
    const items = buildWatchItems(emptySummary(), undefined, null);
    expect(healthWatchSummary(items).banner).toBe('No signals in this window');
  });

  it('surfaces missing DM migration in watch list', () => {
    const items = buildWatchItems(emptySummary(), undefined, null);
    expect(items.some((item) => item.id === 'dm_metrics')).toBe(true);
  });
});

import {describe, expect, it, vi} from 'vitest';
import {
  applyLaunchEventRedirect,
  shouldApplyLaunchRedirectAtPath,
  shouldResolveLaunchRedirect,
} from '../src/lib/launchRedirect';

const readyWithToken = {
  ready: true,
  accessToken: 'tok',
  launchEventId: null as string | null,
  guildId: 'g1',
};

describe('shouldApplyLaunchRedirectAtPath', () => {
  it('allows guild launch-intent redirect from browse home only', () => {
    expect(shouldApplyLaunchRedirectAtPath('/', readyWithToken)).toBe(true);
    expect(shouldApplyLaunchRedirectAtPath('/create', readyWithToken)).toBe(false);
    expect(shouldApplyLaunchRedirectAtPath('/event/abc', readyWithToken)).toBe(false);
  });

  it('always allows embed open_event redirect', () => {
    const embed = {...readyWithToken, launchEventId: 'evt-1'};
    expect(shouldApplyLaunchRedirectAtPath('/create', embed)).toBe(true);
    expect(shouldApplyLaunchRedirectAtPath('/profile', embed)).toBe(true);
  });
});

describe('applyLaunchEventRedirect', () => {
  it('skips navigate when not on an eligible path', async () => {
    const navigate = vi.fn();
    await applyLaunchEventRedirect(readyWithToken, {
      isConfigured: true,
      pathname: '/my-events',
      navigate,
      cancelled: () => false,
      fetchIntent: vi.fn(),
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to embed event from any path', async () => {
    const navigate = vi.fn();
    await applyLaunchEventRedirect(
      {...readyWithToken, launchEventId: 'evt-99'},
      {
        isConfigured: true,
        pathname: '/profile',
        navigate,
        cancelled: () => false,
        fetchIntent: vi.fn(),
      },
    );
    expect(navigate).toHaveBeenCalledWith('/event/evt-99', {replace: true});
  });

  it('resolves guild intent on home', async () => {
    const navigate = vi.fn();
    const fetchIntent = vi.fn(async () => 'evt-guild');
    await applyLaunchEventRedirect(readyWithToken, {
      isConfigured: true,
      pathname: '/',
      navigate,
      cancelled: () => false,
      fetchIntent,
    });
    expect(fetchIntent).toHaveBeenCalledWith('tok', 'g1');
    expect(navigate).toHaveBeenCalledWith('/event/evt-guild', {replace: true});
  });

  it('no-ops when launch redirect is not applicable', async () => {
    const navigate = vi.fn();
    await applyLaunchEventRedirect(
      {ready: false, accessToken: null, launchEventId: null, guildId: null},
      {
        isConfigured: true,
        pathname: '/',
        navigate,
        cancelled: () => false,
        fetchIntent: vi.fn(),
      },
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('shouldResolveLaunchRedirect', () => {
  it('requires ready, token, and launch context', () => {
    expect(shouldResolveLaunchRedirect(readyWithToken)).toBe(true);
    expect(
      shouldResolveLaunchRedirect({
        ready: true,
        accessToken: 'tok',
        launchEventId: null,
        guildId: null,
      }),
    ).toBe(false);
  });
});

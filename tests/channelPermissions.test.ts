import {describe, expect, it} from 'vitest';
import {hasPostPermissions} from '@edge/channelPermissions.ts';

describe('hasPostPermissions', () => {
  it('requires Create Invite in addition to post permissions', () => {
    const postOnly = 0x400n | 0x800n | 0x4000n;
    const withInvite = postOnly | 0x1n;
    expect(hasPostPermissions(postOnly)).toBe(false);
    expect(hasPostPermissions(withInvite)).toBe(true);
  });
});

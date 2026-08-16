import {describe, expect, it} from 'vitest';
import {assertTargetNotLocked, validateRankedAgainstEvent} from '@edge/eventSpec.ts';
import {VALIDATION_CODES} from '@edge/validationCodes.ts';

/** assertTargetNotLocked ignores supabase — pass a stub. */
const supabase = {} as Parameters<typeof assertTargetNotLocked>[0];

describe('assertTargetNotLocked', () => {
  const published = {
    id: 'e1',
    status: 'open',
    host_discord_id: 'h1',
    guild_id: 'g1',
    channel_id: 'c1',
    discord_message_id: 'm1',
    starts_at: new Date(Date.now() + 86_400_000).toISOString(),
    game: 'fh5',
  };

  it('rejects game change after publish', async () => {
    const code = await assertTargetNotLocked(supabase, published, {game: 'fh6'});
    expect(code).toBe(VALIDATION_CODES.GAME_LOCKED);
  });

  it('allows same game on published edit', async () => {
    const code = await assertTargetNotLocked(supabase, published, {game: 'fh5'});
    expect(code).toBeNull();
  });

  it('rejects ranked flip on published edit', async () => {
    const code = await assertTargetNotLocked(supabase, published, {is_ranked: true});
    expect(code).toBe(VALIDATION_CODES.RANKED_LOCKED);
  });

  it('ignores omitted is_ranked on published edit', async () => {
    const code = await assertTargetNotLocked(
      supabase,
      {...published, is_ranked: true},
      {game: 'fh5'},
    );
    expect(code).toBeNull();
  });

  it('allows same ranked flag on published edit', async () => {
    const code = await assertTargetNotLocked(supabase, {...published, is_ranked: true}, {
      is_ranked: true,
    });
    expect(code).toBeNull();
  });

  it('allows voice channel change after publish', async () => {
    const code = await assertTargetNotLocked(supabase, published, {
      voice_channel_id: 'vc-2',
    });
    expect(code).toBeNull();
  });
});

describe('validateRankedAgainstEvent', () => {
  it('blocks enabling ranked on non-allowlisted guild', () => {
    expect(validateRankedAgainstEvent(true, false)).toBe(
      VALIDATION_CODES.RANKED_GUILD_NOT_ALLOWED,
    );
  });

  it('grandfathers already-ranked events if allowlist drops', () => {
    expect(validateRankedAgainstEvent(true, false, true)).toBeNull();
  });

  it('allows enabling when guild is allowlisted', () => {
    expect(validateRankedAgainstEvent(true, true)).toBeNull();
  });
});

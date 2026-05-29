import type {CarRuleMode} from '../../lib/types';
import {hasGamertag} from '../../lib/gamertag';
import type {CreateEventStepIndex} from './constants';

export type PublishGap = {
  message: string;
  step: CreateEventStepIndex;
};

export function collectPublishGaps(input: {
  channelId: string;
  carRuleMode: CarRuleMode;
  carCount: number;
  lobbyLeaderIsHost: boolean;
  lobbyLeaderDiscordId: string | null;
  hostGamertag?: string;
}): PublishGap[] {
  const gaps: PublishGap[] = [];
  if (!input.channelId) {
    gaps.push({message: 'create.gapChannel', step: 1});
  }
  if (input.carRuleMode === 'restricted_list' && input.carCount === 0) {
    gaps.push({message: 'create.gapCars', step: 0});
  }
  if (input.lobbyLeaderIsHost && !hasGamertag(input.hostGamertag)) {
    gaps.push({message: 'create.gapConvoyGamertag', step: 1});
  } else if (!input.lobbyLeaderIsHost && !input.lobbyLeaderDiscordId) {
    gaps.push({message: 'create.gapConvoyLeader', step: 1});
  }
  return gaps;
}

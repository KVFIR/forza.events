import type {CarRuleMode} from '../../lib/types';
import type {CreateEventStepIndex} from './constants';

export type PublishGap = {
  message: string;
  step: CreateEventStepIndex;
};

export function collectPublishGaps(input: {
  channelId: string;
  carRuleMode: CarRuleMode;
  carCount: number;
}): PublishGap[] {
  const gaps: PublishGap[] = [];
  if (!input.channelId) {
    gaps.push({message: 'create.gapChannel', step: 1});
  }
  if (input.carRuleMode === 'restricted_list' && input.carCount === 0) {
    gaps.push({message: 'create.gapCars', step: 0});
  }
  return gaps;
}

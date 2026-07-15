import type {CarRuleMode} from './eventSpec.ts';

/** Keep in sync with `src/lib/carRules.ts` (`openBuildHasDisplayRules`). */
export function openBuildHasDisplayRules(
  mode: CarRuleMode | string | null | undefined,
  maxPi: number | null | undefined,
  additionalRestrictions: string | null | undefined,
): boolean {
  if (mode === 'restricted_list') return false;
  return maxPi != null || Boolean(additionalRestrictions?.trim());
}

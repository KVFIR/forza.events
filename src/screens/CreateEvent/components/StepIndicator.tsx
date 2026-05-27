import {useTranslation} from 'react-i18next';
import {Trans} from 'react-i18next';
import {cn} from '../../../lib/cn';
import {
  segmentContainerClass,
  segmentItemBaseClass,
  segmentItemIdleClass,
  segmentItemSelectedClass,
} from '../../../components/ui/buttonStyles';
import {Alert} from '../../../components/ui/Alert';
import type {CreateEventStepIndex} from '../constants';

const STEP_KEYS = ['create.steps.event', 'create.steps.publish'] as const;

type StepIndicatorProps = {
  step: CreateEventStepIndex;
  freeNavigation?: boolean;
  onStepClick?: (index: CreateEventStepIndex) => void;
};

export function StepIndicator({step, freeNavigation, onStepClick}: StepIndicatorProps) {
  const {t} = useTranslation();

  return (
    <nav
      className={cn('mb-6 flex gap-1', segmentContainerClass)}
      aria-label={t('create.formProgress')}
    >
      {STEP_KEYS.map((labelKey, i) => {
        const idx = i as CreateEventStepIndex;
        const done = idx < step;
        const active = idx === step;
        const clickable = Boolean(onStepClick) && (freeNavigation ? !active : done);

        return (
          <button
            key={labelKey}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStepClick?.(idx)}
            className={cn(
              segmentItemBaseClass,
              'flex-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide',
              active && segmentItemSelectedClass,
              clickable && !active && 'text-slate-400 hover:text-slate-200',
              !active && !clickable && segmentItemIdleClass,
              !clickable && 'cursor-default',
            )}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </nav>
  );
}

export function FormAlerts({
  isConfigured,
  isSignedIn,
  authInitializing,
  globalError,
}: {
  isConfigured: boolean;
  isSignedIn: boolean;
  authInitializing: boolean;
  globalError: string | null;
}) {
  const {t} = useTranslation();

  return (
    <>
      {!isConfigured && (
        <Alert variant="sky" className="mb-4">
          <Trans i18nKey="create.supabaseEnvAlert" components={{1: <code className="text-amber-50" />, 3: <code className="text-amber-50" />, 5: <code />, 7: <code />}} />
        </Alert>
      )}
      {isConfigured && !isSignedIn && !authInitializing && (
        <Alert variant="neutral" className="mb-4">
          {t('auth.openInDiscordSave')}
        </Alert>
      )}
      {globalError && (
        <Alert variant="error" className="mb-4">
          {globalError}
        </Alert>
      )}
    </>
  );
}

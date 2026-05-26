import {cn} from '../../../lib/cn';
import {
  segmentContainerClass,
  segmentItemBaseClass,
  segmentItemIdleClass,
  segmentItemSelectedClass,
} from '../../../components/ui/buttonStyles';
import {Alert} from '../../../components/ui/Alert';
import {STEPS, type CreateEventStepIndex} from '../constants';

type StepIndicatorProps = {
  step: CreateEventStepIndex;
  /** When true (e.g. editing an existing event), every step except the current one is clickable. */
  freeNavigation?: boolean;
  onStepClick?: (index: CreateEventStepIndex) => void;
};

export function StepIndicator({step, freeNavigation, onStepClick}: StepIndicatorProps) {
  return (
    <nav className={cn('mb-6 flex gap-1', segmentContainerClass)}>
      {STEPS.map((label, i) => {
        const idx = i as CreateEventStepIndex;
        const done = idx < step;
        const active = idx === step;
        const clickable =
          Boolean(onStepClick) && (freeNavigation ? !active : done);

        return (
          <button
            key={label}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStepClick?.(idx)}
            className={cn(
              segmentItemBaseClass,
              'flex-1 py-1.5 text-center text-[10px] uppercase tracking-widest',
              active && segmentItemSelectedClass,
              clickable && !active && 'text-slate-400 hover:text-slate-200',
              !active && !clickable && segmentItemIdleClass,
              !clickable && 'cursor-default',
            )}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function FormAlerts({
  isConfigured,
  isSignedIn,
  globalError,
}: {
  isConfigured: boolean;
  isSignedIn: boolean;
  globalError: string | null;
}) {
  return (
    <>
      {!isConfigured && (
        <Alert variant="sky" className="mb-4">
          Add <code className="text-amber-50">SUPABASE_URL</code> and{' '}
          <code className="text-amber-50">SUPABASE_ANON_KEY</code> to <code>.env</code>, then restart{' '}
          <code>npm run dev</code>.
        </Alert>
      )}
      {isConfigured && !isSignedIn && (
        <Alert variant="neutral" className="mb-4">
          Open this app in Discord to save drafts, join events, and publish.
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

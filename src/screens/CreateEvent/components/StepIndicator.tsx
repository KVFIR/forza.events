import {cn} from '../../../lib/cn';
import {STEPS, type CreateEventStepIndex} from '../constants';

type StepIndicatorProps = {
  step: CreateEventStepIndex;
  onStepClick?: (index: CreateEventStepIndex) => void;
};

export function StepIndicator({step, onStepClick}: StepIndicatorProps) {
  return (
    <nav className="mb-6 flex gap-1">
      {STEPS.map((label, i) => {
        const idx = i as CreateEventStepIndex;
        const done = idx < step;
        const active = idx === step;
        const clickable = done && onStepClick;

        return (
          <button
            key={label}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStepClick(idx)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-center text-[10px] font-bold uppercase tracking-widest transition-colors',
              active && 'bg-white/[0.1] text-white',
              done && 'text-slate-400 hover:text-slate-200',
              !active && !done && 'text-muted',
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
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
          Add <code className="text-amber-50">SUPABASE_URL</code> and{' '}
          <code className="text-amber-50">SUPABASE_ANON_KEY</code> to <code>.env</code>, then restart{' '}
          <code>npm run dev</code>.
        </p>
      )}
      {isConfigured && !isSignedIn && (
        <p className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-muted">
          Open this app in Discord to save drafts, join events, and publish.
        </p>
      )}
      {globalError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/25 bg-red-950/30 px-3 py-2 text-xs text-red-200"
        >
          {globalError}
        </p>
      )}
    </>
  );
}

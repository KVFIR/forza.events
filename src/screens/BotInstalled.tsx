import {ContentReveal} from '../components/ui/ContentReveal';

export function BotInstalled() {
  return (
    <ContentReveal className="flex flex-col items-center py-16 text-center">
      <h1 className="text-lg font-bold text-white">Bot added</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        You can close this browser tab. In Discord, return to the FORZA.EVENTS Activity, open{' '}
        <span className="font-semibold text-slate-200">Create event → Target</span>, and tap{' '}
        <span className="font-semibold text-slate-200">Refresh list</span>.
      </p>
      <p className="mt-4 max-w-sm text-xs text-muted">
        This page is only a confirmation in the browser. The app runs inside Discord, not here.
      </p>
    </ContentReveal>
  );
}

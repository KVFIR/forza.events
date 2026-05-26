/**
 * Shown when the deploy URL is opened in a normal browser tab.
 * MVP is Discord Activity–only; browser web needs a separate Discord app (deferred).
 */
export function DiscordOnlyGate() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-[13px] font-black tracking-tight text-white">
          FORZA<span className="text-accent-purple-light">.EVENTS</span>
        </p>
        <h1 className="text-lg font-semibold text-white">Open in Discord</h1>
        <p className="text-sm leading-relaxed text-muted">
          This build is a Discord Activity. Launch it from the App Launcher or a server voice
          channel — not from a regular browser tab.
        </p>
      </div>
    </div>
  );
}

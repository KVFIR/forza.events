import {Link} from 'react-router-dom';
import {ContentReveal} from '../components/ui/ContentReveal';

export function BotInstalled() {
  return (
    <ContentReveal className="flex flex-col items-center py-16 text-center">
      <h1 className="text-lg font-bold text-white">Bot added</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        FORZA.EVENTS was installed on your server. Return to the Discord Activity, open Create
        event → Target, and tap <span className="font-semibold text-slate-200">Refresh list</span>.
      </p>
      <Link
        to="/create"
        className="mt-6 text-sm font-semibold text-accent-purple-light hover:text-accent-purple transition-colors"
      >
        Open create event
      </Link>
    </ContentReveal>
  );
}

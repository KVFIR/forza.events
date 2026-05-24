import {useEffect, useState} from 'react';
import {listChannels} from '../lib/api';
import {Button} from './ui/Button';

type Props = {
  guildId: string;
  accessToken: string;
  onSelect: (channelId: string) => void;
  onCancel: () => void;
};

export function ChannelPicker({guildId, accessToken, onSelect, onCancel}: Props) {
  const [channels, setChannels] = useState<{id: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    void listChannels(accessToken, guildId)
      .then((r) => setChannels(r.channels))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [guildId, accessToken]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-card p-5">
        <h2 className="text-lg font-bold text-white">Publish to channel</h2>
        <p className="mt-1 text-sm text-muted">Choose where the event embed will be posted.</p>

        {loading && <p className="mt-4 text-sm text-muted">Loading channels…</p>}
        {error && <p className="mt-4 text-sm text-accent-red">{error}</p>}

        {!loading && !error && (
          <select
            className="mt-4 w-full rounded-xl border border-white/[0.08] bg-surface px-3 py-3 text-sm text-white"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select a channel</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
        )}

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={!selected}
            onClick={() => onSelect(selected)}
          >
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}

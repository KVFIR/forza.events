import {useCallback, useEffect, useState} from 'react';
import {listChannels} from '../lib/api';
import {Button} from './ui/Button';
import {Select} from './ui/Select';
import {InlineLoading} from './ui/InlineLoading';
import {ModalBackdrop, ModalPanel} from './ui/ModalShell';

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

  const loadChannels = useCallback(() => {
    setLoading(true);
    setError(null);
    void listChannels(accessToken, guildId)
      .then((r) => setChannels(r.channels))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [guildId, accessToken]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  return (
    <ModalBackdrop>
      <ModalPanel>
        <h2 className="text-lg font-bold text-white">Publish to channel</h2>
        <p className="mt-1 text-sm text-muted">Choose where the event embed will be posted.</p>

        {loading && <InlineLoading label="Loading channels" className="mt-4" />}

        {!loading && error && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-accent-red">{error}</p>
            <Button type="button" variant="secondary" className="w-full" onClick={loadChannels}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && (
          <Select className="mt-4" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select a channel</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </Select>
        )}

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={!selected || loading || !!error}
            onClick={() => onSelect(selected)}
          >
            Publish
          </Button>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}

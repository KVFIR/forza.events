import {useTranslation} from 'react-i18next';
import {Button} from './ui/Button';
import {ModalBackdrop, ModalPanel} from './ui/ModalShell';
import {track} from '../lib/analytics';
import {cn} from '../lib/cn';
import {getGuildContext} from '../lib/discord';
import {
  buildBotInstallUrl,
  openBotInstallUrl,
  openSupportGuildInvite,
} from '../lib/discordInstall';
import type {NotificationDmSetupSource} from '../lib/notificationDm';

type Props = {
  open: boolean;
  source: NotificationDmSetupSource;
  onClose: () => void;
};

function PathRow({
  title,
  hint,
  recommended,
  onClick,
}: {
  title: string;
  hint: string;
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border px-4 py-3 text-left transition-colors',
        recommended
          ? 'border-accent-purple/35 bg-accent-purple/10 hover:border-accent-purple/50 hover:bg-accent-purple/15'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
      )}
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>
    </button>
  );
}

export function NotificationDmSetupDialog({open, source, onClose}: Props) {
  const {t} = useTranslation();
  const canAddBot = Boolean(buildBotInstallUrl());

  if (!open) return null;

  return (
    <ModalBackdrop onBackdropClick={onClose}>
      <ModalPanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="dm-setup-title"
        aria-describedby="dm-setup-desc"
      >
        <h2 id="dm-setup-title" className="text-lg font-bold text-white">
          {t('notifications.dmEnableBlockedTitle')}
        </h2>
        <p id="dm-setup-desc" className="mt-2 text-sm leading-relaxed text-muted">
          {t('notifications.dmSetupBody')}
        </p>
        <div className="mt-4 space-y-2">
          <PathRow
            recommended
            title={t('notifications.joinSupportServer')}
            hint={t('notifications.joinSupportServerHint')}
            onClick={() => {
              onClose();
              track('bot_install_click', {meta: {source, action: 'join_support'}});
              void openSupportGuildInvite();
            }}
          />
          {canAddBot ? (
            <PathRow
              title={t('publish.addBot')}
              hint={t('notifications.addBotHint')}
              onClick={() => {
                onClose();
                track('bot_install_click', {meta: {source, action: 'add_bot'}});
                const {guildId} = getGuildContext();
                void openBotInstallUrl(guildId ? {guildId} : undefined);
              }}
            />
          ) : null}
        </div>
        <Button type="button" variant="secondary" className="mt-2 w-full" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </ModalPanel>
    </ModalBackdrop>
  );
}

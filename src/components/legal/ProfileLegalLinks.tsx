import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {isDiscordActivityFrame} from '../../lib/supabaseEnv';
import {TextButton, TextLink} from '../ui/TextButton';
import {LegalDocumentModal, type LegalDocumentKind} from './LegalDocumentModal';

export function ProfileLegalLinks() {
  const {t} = useTranslation();
  const [modalKind, setModalKind] = useState<LegalDocumentKind | null>(null);
  const inActivity = isDiscordActivityFrame();

  const linkClass = 'font-normal text-white/25 hover:text-white/45';

  function open(kind: LegalDocumentKind) {
    setModalKind(kind);
  }

  return (
    <>
      <nav
        className="mt-8 flex justify-center gap-1.5 text-[10px]"
        aria-label={t('legal.navAria')}
      >
        {inActivity ? (
          <>
            <TextButton type="button" className={linkClass} onClick={() => open('terms')}>
              {t('legal.termsLink')}
            </TextButton>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <TextButton type="button" className={linkClass} onClick={() => open('privacy')}>
              {t('legal.privacyLink')}
            </TextButton>
          </>
        ) : (
          <>
            <TextLink to="/terms" className={linkClass}>
              {t('legal.termsLink')}
            </TextLink>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <TextLink to="/privacy" className={linkClass}>
              {t('legal.privacyLink')}
            </TextLink>
          </>
        )}
      </nav>

      {inActivity ? (
        <LegalDocumentModal
          open={modalKind !== null}
          kind={modalKind ?? 'terms'}
          onClose={() => setModalKind(null)}
          onSwitchKind={setModalKind}
        />
      ) : null}
    </>
  );
}

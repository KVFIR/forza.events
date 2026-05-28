import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {privacyPolicyEn} from '../../legal/privacyContent';
import {termsOfServiceEn} from '../../legal/termsContent';
import type {LegalDocument} from '../../legal/types';
import {Button} from '../ui/Button';
import {ModalBackdrop, ModalPanel} from '../ui/ModalShell';
import {TextButton} from '../ui/TextButton';
import {LegalDocumentView} from './LegalDocumentView';

export type LegalDocumentKind = 'terms' | 'privacy';

const DOCUMENTS: Record<LegalDocumentKind, LegalDocument> = {
  terms: termsOfServiceEn,
  privacy: privacyPolicyEn,
};

type Props = {
  open: boolean;
  kind: LegalDocumentKind;
  onClose: () => void;
  onSwitchKind: (kind: LegalDocumentKind) => void;
};

export function LegalDocumentModal({open, kind, onClose, onSwitchKind}: Props) {
  const {t} = useTranslation();
  const document = DOCUMENTS[kind];
  const otherKind: LegalDocumentKind = kind === 'terms' ? 'privacy' : 'terms';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalBackdrop onBackdropClick={onClose}>
      <ModalPanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="flex max-h-[min(90dvh,42rem)] w-full max-w-lg flex-col p-0"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="legal-modal-title" className="text-base font-bold text-white">
              {document.title}
            </h2>
            <p className="mt-1 text-[10px] text-muted">
              {t('legal.lastUpdated', {date: document.lastUpdated})}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('legal.close')}
          >
            ×
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-[10px] leading-relaxed text-muted">{t('legal.englishAuthoritative')}</p>
          <LegalDocumentView document={document} />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          <TextButton type="button" tone="nav" className="normal-case tracking-normal" onClick={() => onSwitchKind(otherKind)}>
            {otherKind === 'privacy' ? t('legal.viewPrivacy') : t('legal.viewTerms')}
          </TextButton>
          <Button type="button" variant="secondary" size="compact" onClick={onClose}>
            {t('legal.close')}
          </Button>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}

import {LegalDocumentView} from '../components/legal/LegalDocumentView';
import {LegalPageLayout} from '../components/legal/LegalPageLayout';
import {termsOfServiceEn} from '../legal/termsContent';

export function TermsOfService() {
  return (
    <LegalPageLayout title={termsOfServiceEn.title} lastUpdated={termsOfServiceEn.lastUpdated}>
      <LegalDocumentView document={termsOfServiceEn} />
    </LegalPageLayout>
  );
}

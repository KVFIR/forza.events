import {LegalDocumentView} from '../components/legal/LegalDocumentView';
import {LegalPageLayout} from '../components/legal/LegalPageLayout';
import {privacyPolicyEn} from '../legal/privacyContent';

export function PrivacyPolicy() {
  return (
    <LegalPageLayout title={privacyPolicyEn.title} lastUpdated={privacyPolicyEn.lastUpdated}>
      <LegalDocumentView document={privacyPolicyEn} />
    </LegalPageLayout>
  );
}

import {LegalDocumentView} from '../components/legal/LegalDocumentView';
import {LegalPageLayout} from '../components/legal/LegalPageLayout';
import {privacyPolicyEn} from '../legal/privacyContent';

export function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title={privacyPolicyEn.title}
      lastUpdated={privacyPolicyEn.lastUpdated}
      otherPolicy={{href: '/terms', labelKey: 'legal.viewTerms'}}
    >
      <LegalDocumentView document={privacyPolicyEn} />
    </LegalPageLayout>
  );
}

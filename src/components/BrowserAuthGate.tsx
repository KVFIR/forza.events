import type {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {isPublicBrowserPath, shouldRequireBrowserSignIn} from '../lib/runtime';
import {PageLoading} from './ui/PageLoading';
import {SignInRequiredState} from './SignInRequiredState';

type Props = {
  children: ReactNode;
};

/** Blocks production browser tabs until Discord OAuth completes. */
export function BrowserAuthGate({children}: Props) {
  const {t} = useTranslation();
  const {pathname} = useLocation();
  const {loading, isConfigured, isSignedIn} = useAuth();

  if (!shouldRequireBrowserSignIn()) return children;
  if (isPublicBrowserPath(pathname)) return children;

  if (loading) {
    return <PageLoading label={t('loading.page')} className="pb-8 pt-5" />;
  }

  if (!isConfigured) return children;

  if (isSignedIn) return children;

  return (
    <SignInRequiredState
      description={t('auth.browserSignInHint')}
      className="min-h-[50vh] py-20"
    />
  );
}

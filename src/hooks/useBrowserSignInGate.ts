import {useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {isPublicBrowserPath, shouldRequireBrowserSignIn} from '../lib/runtime';
import {isLocalAnalyticsDashboardPath} from '../lib/localAnalyticsDashboard';

export type BrowserSignInGateState = 'loading' | 'required' | null;

/**
 * Full-screen hard gate (off by default). Guests browse showcase paths;
 * Create / Profile / My Events soft-prompt in-screen. `/sign-in` is separate in App.
 */
export function useBrowserSignInGate(): BrowserSignInGateState {
  const {pathname} = useLocation();
  const {loading, isConfigured, isSignedIn} = useAuth();

  if (!shouldRequireBrowserSignIn()) return null;
  if (isPublicBrowserPath(pathname)) return null;
  if (isLocalAnalyticsDashboardPath(pathname)) return null;

  if (loading) return 'loading';
  if (!isConfigured) return null;
  if (!isSignedIn) return 'required';

  return null;
}

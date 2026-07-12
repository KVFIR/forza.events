import {useLocation} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {isPublicBrowserPath, shouldRequireBrowserSignIn} from '../lib/runtime';

export type BrowserSignInGateState = 'loading' | 'required' | null;

/** When set, AppRoutes should render the full-screen sign-in instead of app chrome. */
export function useBrowserSignInGate(): BrowserSignInGateState {
  const {pathname} = useLocation();
  const {loading, isConfigured, isSignedIn} = useAuth();

  if (!shouldRequireBrowserSignIn()) return null;
  if (isPublicBrowserPath(pathname)) return null;

  if (loading) return 'loading';
  if (!isConfigured) return null;
  if (!isSignedIn) return 'required';

  return null;
}

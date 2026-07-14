import './App.css';
import {lazy, Suspense} from 'react';
import {useTranslation} from 'react-i18next';
import {
  createBrowserRouter,
  Navigate,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router-dom';
import {AppBootGate} from './components/AppBootGate';
import {BrowserSignInScreen} from './components/BrowserSignInScreen';
import {DiscordOnlyGate} from './components/DiscordOnlyGate';
import {Navbar} from './components/Navbar';
import {Logo} from './components/ui/Logo';
import {AuthProvider, useAuth} from './context/AuthContext';
import {DiscordLayoutProvider, useDiscordLayout} from './context/DiscordLayoutContext';
import {DiscordRichPresenceProvider} from './context/DiscordRichPresenceContext';
import {JoinedEventsProvider} from './context/JoinedEventsContext';
import {PageMetaProvider} from './context/PageMetaContext';
import {DiscordRichPresenceSync} from './components/DiscordRichPresenceSync';
import type {ReactNode} from 'react';
import {PageLoading} from './components/ui/PageLoading';
import {Spinner} from './components/ui/Spinner';
import {useBrowserSignInGate} from './hooks/useBrowserSignInGate';
import {isPublicLegalBrowserPath} from './lib/publicLegalPaths';
import {isLocalAnalyticsDashboardPath} from './lib/localAnalyticsDashboard';
import {shouldShowDiscordOnlyGate} from './lib/runtime';

const BrowseEvents = lazy(() =>
  import('./screens/BrowseEvents').then((m) => ({default: m.BrowseEvents})),
);
const MyEvents = lazy(() => import('./screens/MyEvents').then((m) => ({default: m.MyEvents})));
const CreateEvent = lazy(() =>
  import('./screens/CreateEvent/index').then((m) => ({default: m.CreateEvent})),
);
const EventDetail = lazy(() =>
  import('./screens/EventDetail/index').then((m) => ({default: m.EventDetail})),
);
const EventResults = lazy(() =>
  import('./screens/EventResults').then((m) => ({default: m.EventResults})),
);
const Profile = lazy(() => import('./screens/Profile').then((m) => ({default: m.Profile})));
const AuthCallback = lazy(() =>
  import('./screens/AuthCallback').then((m) => ({default: m.AuthCallback})),
);
const BotInstalled = lazy(() =>
  import('./screens/BotInstalled').then((m) => ({default: m.BotInstalled})),
);
const TermsOfService = lazy(() =>
  import('./screens/TermsOfService').then((m) => ({default: m.TermsOfService})),
);
const PrivacyPolicy = lazy(() =>
  import('./screens/PrivacyPolicy').then((m) => ({default: m.PrivacyPolicy})),
);
const AnalyticsDashboard = lazy(() =>
  import('./screens/AnalyticsDashboard').then((m) => ({default: m.AnalyticsDashboard})),
);

function RouteFallback() {
  const {t} = useTranslation();
  return <PageLoading label={t('loading.page')} className="pb-8 pt-5" />;
}

function BrowserSignInLoading() {
  const {t} = useTranslation();
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Logo size="lg" />
      <Spinner size="lg" />
      <p className="text-sm text-muted">{t('loading.page')}</p>
    </div>
  );
}

function AppShell({children}: {children: ReactNode}) {
  const {isCompact} = useDiscordLayout();

  if (isCompact) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-base"
        data-discord-layout="compact"
      >
        <Logo size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-discord-layout="focused">
      {children}
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const {isSignedIn} = useAuth();
  const signInGate = useBrowserSignInGate();
  const isLegalPage = isPublicLegalBrowserPath(location.pathname);
  const isAnalyticsPage = isLocalAnalyticsDashboardPath(location.pathname);

  if (location.pathname === '/sign-in') {
    if (isSignedIn) return <Navigate to="/" replace />;
    return <BrowserSignInScreen />;
  }

  if (signInGate === 'loading') return <BrowserSignInLoading />;
  if (signInGate === 'required') return <BrowserSignInScreen />;

  const hideNavbar = isLegalPage || isAnalyticsPage;

  return (
    <AppShell>
      {!hideNavbar ? <Navbar /> : null}
      <div
        className={
          hideNavbar
            ? 'min-w-0 flex-1'
            : 'app-main-column flex min-h-screen flex-col px-3 sm:px-5 md:px-8 lg:px-10'
        }
      >
        <main className={hideNavbar ? 'min-w-0' : 'min-w-0 flex-1 pb-8'}>
          <AppBootGate>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<BrowseEvents />} />
                <Route path="/my-events" element={<MyEvents />} />
                <Route path="/event/:id" element={<EventDetail />} />
                <Route path="/event/:id/results" element={<EventResults />} />
                <Route path="/create" element={<CreateEvent />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/bot-installed" element={<BotInstalled />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AppBootGate>
        </main>
      </div>
    </AppShell>
  );
}

function AppWithProviders() {
  return (
    <AuthProvider>
      <DiscordLayoutProvider>
        <DiscordRichPresenceProvider>
          <JoinedEventsProvider>
            <PageMetaProvider>
              <DiscordRichPresenceSync />
              <AppRoutes />
            </PageMetaProvider>
          </JoinedEventsProvider>
        </DiscordRichPresenceProvider>
      </DiscordLayoutProvider>
    </AuthProvider>
  );
}

/** Data router for SPA navigation. */
const appRouter = createBrowserRouter([{path: '*', element: <AppWithProviders />}]);

export default function App() {
  if (shouldShowDiscordOnlyGate()) {
    return <DiscordOnlyGate />;
  }

  return <RouterProvider router={appRouter} />;
}

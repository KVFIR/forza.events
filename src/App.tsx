import './App.css';
import {lazy, Suspense} from 'react';
import {useTranslation} from 'react-i18next';
import {BrowserRouter, Navigate, Route, Routes, useLocation} from 'react-router-dom';
import {AppBootGate} from './components/AppBootGate';
import {DiscordOnlyGate} from './components/DiscordOnlyGate';
import {Navbar} from './components/Navbar';
import {Logo} from './components/ui/Logo';
import {AuthProvider} from './context/AuthContext';
import {DiscordLayoutProvider, useDiscordLayout} from './context/DiscordLayoutContext';
import {JoinedEventsProvider} from './context/JoinedEventsContext';
import type {ReactNode} from 'react';
import {PageLoading} from './components/ui/PageLoading';
import {isPublicLegalBrowserPath} from './lib/publicLegalPaths';
import {shouldShowDiscordOnlyGate} from './lib/runtime';

const BrowseEvents = lazy(() =>
  import('./screens/BrowseEvents').then((m) => ({default: m.BrowseEvents})),
);
const MyEvents = lazy(() => import('./screens/MyEvents').then((m) => ({default: m.MyEvents})));
const CreateEvent = lazy(() =>
  import('./screens/CreateEvent/index').then((m) => ({default: m.CreateEvent})),
);
const EventDetail = lazy(() =>
  import('./screens/EventDetail').then((m) => ({default: m.EventDetail})),
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

function RouteFallback() {
  const {t} = useTranslation();
  return <PageLoading label={t('loading.page')} className="pb-8 pt-5" />;
}

function AppShell({children}: {children: ReactNode}) {
  const {isCompact} = useDiscordLayout();

  if (isCompact) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-base"
        data-discord-layout="compact"
      >
        <Logo size="hero" />
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
  const isLegalPage = isPublicLegalBrowserPath(location.pathname);

  return (
    <AppShell>
      {!isLegalPage ? <Navbar /> : null}
      <div
        className={
          isLegalPage
            ? 'min-w-0 flex-1'
            : 'app-main-column flex min-h-screen flex-col px-3 sm:px-5 md:px-8 lg:px-10'
        }
      >
        <main className={isLegalPage ? 'min-w-0' : 'min-w-0 flex-1 pb-8'}>
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
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AppBootGate>
        </main>
      </div>
    </AppShell>
  );
}

export default function App() {
  if (shouldShowDiscordOnlyGate()) {
    return <DiscordOnlyGate />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <DiscordLayoutProvider>
          <JoinedEventsProvider>
            <AppRoutes />
          </JoinedEventsProvider>
        </DiscordLayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

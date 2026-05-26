import './App.css';
import {lazy, Suspense} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {DiscordOnlyGate} from './components/DiscordOnlyGate';
import {Navbar} from './components/Navbar';
import {AuthProvider} from './context/AuthContext';
import {JoinedEventsProvider} from './context/JoinedEventsContext';
import {PageLoading} from './components/ui/PageLoading';
import {useLoadingUI} from './hooks/useLoadingUI';
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

function RouteFallback() {
  const showLoading = useLoadingUI(true);
  return showLoading ? <PageLoading label="Loading page" className="pb-8 pt-5" /> : null;
}

export default function App() {
  if (shouldShowDiscordOnlyGate()) {
    return <DiscordOnlyGate />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <JoinedEventsProvider>
          <div className="min-h-screen">
            <Navbar />
            <div className="app-main-column flex min-h-screen flex-col px-3 sm:px-5 md:px-8 lg:px-10">
              <main className="min-w-0 flex-1 pb-8">
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<BrowseEvents />} />
                    <Route path="/my-events" element={<MyEvents />} />
                    <Route path="/event/:id" element={<EventDetail />} />
                    <Route path="/event/:id/results" element={<EventResults />} />
                    <Route path="/create" element={<CreateEvent />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </div>
        </JoinedEventsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

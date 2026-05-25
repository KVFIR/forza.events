import './App.css';
import {lazy, Suspense} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {Navbar} from './components/Navbar';
import {AuthProvider} from './context/AuthContext';
import {JoinedEventsProvider} from './context/JoinedEventsContext';

const BrowseEvents = lazy(() =>
  import('./screens/BrowseEvents').then((m) => ({default: m.BrowseEvents})),
);
const MyEvents = lazy(() => import('./screens/MyEvents').then((m) => ({default: m.MyEvents})));
const CreateEvent = lazy(() =>
  import('./screens/CreateEvent').then((m) => ({default: m.CreateEvent})),
);
const EventDetail = lazy(() =>
  import('./screens/EventDetail').then((m) => ({default: m.EventDetail})),
);
const EventResults = lazy(() =>
  import('./screens/EventResults').then((m) => ({default: m.EventResults})),
);
const Profile = lazy(() => import('./screens/Profile').then((m) => ({default: m.Profile})));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <JoinedEventsProvider>
          <div className="min-h-screen bg-dots">
            <div className="mx-auto flex min-h-screen w-full max-w-full flex-col px-3 sm:px-5 md:px-8 lg:max-w-2xl lg:px-10">
              <Navbar />
              <main className="min-w-0 flex-1 pb-8">
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<BrowseEvents />} />
                    <Route path="/my-events" element={<MyEvents />} />
                    <Route path="/event/:id" element={<EventDetail />} />
                    <Route path="/event/:id/results" element={<EventResults />} />
                    <Route path="/create" element={<CreateEvent />} />
                    <Route path="/profile" element={<Profile />} />
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

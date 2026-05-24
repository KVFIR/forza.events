import './App.css';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {Navbar} from './components/Navbar';
import {AuthProvider} from './context/AuthContext';
import {JoinedEventsProvider} from './context/JoinedEventsContext';
import {BrowseEvents} from './screens/BrowseEvents';
import {MyEvents} from './screens/MyEvents';
import {CreateEvent} from './screens/CreateEvent';
import {EventDetail} from './screens/EventDetail';
import {EventResults} from './screens/EventResults';
import {Profile} from './screens/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <JoinedEventsProvider>
        <div className="min-h-screen bg-dots">
          <div className="mx-auto flex min-h-screen w-full max-w-full flex-col px-3 sm:px-5 md:px-8 lg:max-w-2xl lg:px-10">
            <Navbar />
            <main className="min-w-0 flex-1 pb-8">
              <Routes>
                <Route path="/" element={<BrowseEvents />} />
                <Route path="/my-events" element={<MyEvents />} />
                <Route path="/event/:id" element={<EventDetail />} />
                <Route path="/event/:id/results" element={<EventResults />} />
                <Route path="/create" element={<CreateEvent />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </JoinedEventsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

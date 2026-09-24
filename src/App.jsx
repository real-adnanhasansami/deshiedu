import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Auth/Navbar';
import Login from './components/Auth/Login';
import Home from './pages/Home';
import SectionPage from './pages/SectionPage';
import PlayerPage from './pages/PlayerPage';
import AdminPage from './pages/AdminPage';
import PrivateSpacePage from './pages/PrivateSpacePage';
import PomodoroTimer from './components/Focus/PomodoroTimer';

// Signed-in users shouldn't see the Login form — send them home.
function RedirectIfAuthed({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />
        <Route path="/" element={<Home />} />
        <Route path="/my-space" element={<PrivateSpacePage />} />
        <Route path="/section/:sectionId" element={<SectionPage />} />
        {/* Open to everyone — watching a video shouldn't require an
            account. NotesPanel handles its own sign-in prompt for the
            notes feature specifically. /video/:videoId is the primary
            route; /player/:videoId is kept as an alias since earlier
            links use that path. */}
        <Route path="/video/:videoId" element={<PlayerPage />} />
        <Route path="/player/:videoId" element={<PlayerPage />} />
        {/* AdminPage itself checks isAdmin and shows a denied message
            rather than redirecting, so a non-admin hitting this URL
            gets a clear reason rather than a silent bounce. */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <PomodoroTimer />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

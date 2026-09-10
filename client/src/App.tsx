import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import League from './pages/League';
import Login from './pages/Login';
import EpisodePage from './pages/Episode';
import Admin from './pages/Admin';
import Player from './pages/Player';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const hideNav = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-stone-950">
      {!hideNav && <Navbar />}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<League />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/profile/:username" element={<Player />} />
          <Route path="/profile" element={<Navigate to="/" replace />} />
          <Route
            path="/episode/:id"
            element={
              <ProtectedRoute>
                <EpisodePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="/admin/setup" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/episodes" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/results" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/users" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore.js';
import App from '../App.jsx';
import LoginPage from '../pages/LoginPage.jsx';

function RequireAuth({ children, allowedRoles }) {
  const { session, role, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  // In demo mode (no Supabase) role is set to 'admin' by init()
  const isAuthenticated = session !== null || role !== null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role !== null && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Root() {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth allowedRoles={['admin', 'teacher']}>
            <App />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}
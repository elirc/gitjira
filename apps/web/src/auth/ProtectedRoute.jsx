import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// LEARN: this guard is UX, not security. Anyone can delete this component
// in devtools — the API's requireAuth middleware is the actual boundary.
// Client-side checks decide what to RENDER; server-side checks decide what
// is ALLOWED. Confusing the two is how data leaks happen.
export function ProtectedRoute() {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) return <p className="content">Restoring session…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageSpinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/** Pages inside need a logged-in admin; otherwise go to /login and come back afterwards */
export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** The login page: an admin who is already logged in goes straight to the dashboard */
export function GuestRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="Checking your session" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
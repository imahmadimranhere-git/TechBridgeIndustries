import { Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProtectedRoute, { GuestRoute } from './routes/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public: only for visitors who are not logged in */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Phase 17 adds the public /verify/:code page here */}

      {/* Admin area: login required */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
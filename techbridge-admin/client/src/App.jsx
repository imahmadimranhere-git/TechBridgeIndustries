import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import UiShowcasePage from './pages/UiShowcasePage.jsx';
import ProtectedRoute, { GuestRoute } from './routes/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public: only for visitors who are not logged in */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Phase 17 adds the public /verify/:code page here */}

      {/* Admin area: login required, inside the sidebar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/ui" element={<UiShowcasePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
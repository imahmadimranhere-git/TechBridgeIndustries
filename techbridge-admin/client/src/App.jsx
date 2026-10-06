import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import ClientProfilePage from './pages/clients/ClientProfilePage.jsx';
import ClientsPage from './pages/clients/ClientsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DealDetailPage from './pages/deals/DealDetailPage.jsx';
import DealFormPage from './pages/deals/DealFormPage.jsx';
import DealsPage from './pages/deals/DealsPage.jsx';
import InvoiceFormPage from './pages/invoices/InvoiceFormPage.jsx';
import InvoicesPage from './pages/invoices/InvoicesPage.jsx';
import InvoiceViewPage from './pages/invoices/InvoiceViewPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotesPage from './pages/notes/NotesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PaymentsPage from './pages/payments/PaymentsPage.jsx';
import PayoutsPage from './pages/payouts/PayoutsPage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';
import StaffPage from './pages/staff/StaffPage.jsx';
import StaffProfilePage from './pages/staff/StaffProfilePage.jsx';
import UiShowcasePage from './pages/UiShowcasePage.jsx';
import UsersPage from './pages/users/UsersPage.jsx';
import VerifyPage from './pages/VerifyPage.jsx';
import ProtectedRoute, { GuestRoute } from './routes/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public: only for visitors who are not logged in */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Public for everyone (QR codes on PDFs open this) */}
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/verify/:code" element={<VerifyPage />} />

      {/* Admin area: login required, inside the sidebar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientProfilePage />} />

          <Route path="/deals" element={<DealsPage />} />
          <Route path="/deals/new" element={<DealFormPage />} />
          <Route path="/deals/:id" element={<DealDetailPage />} />
          <Route path="/deals/:id/edit" element={<DealFormPage />} />

          <Route path="/payments" element={<PaymentsPage />} />

          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<InvoiceFormPage />} />
          <Route path="/invoices/:id" element={<InvoiceViewPage />} />
          <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />

          <Route path="/staff" element={<StaffPage />} />
          <Route path="/staff/:id" element={<StaffProfilePage />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/reports" element={<ReportsPage />} />

          <Route path="/users" element={<UsersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="/ui" element={<UiShowcasePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
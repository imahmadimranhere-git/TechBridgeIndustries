import { LogOut } from 'lucide-react';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

// Temporary page to check the setup. Phase 17 replaces it with the real dashboard.
const SWATCHES = [
  { label: 'Brand', className: 'bg-brand text-brand-contrast' },
  { label: 'Success', className: 'bg-success-soft text-success' },
  { label: 'Warning', className: 'bg-warning-soft text-warning' },
  { label: 'Danger', className: 'bg-danger-soft text-danger' },
  { label: 'Info', className: 'bg-info-soft text-info' },
  { label: 'Purple', className: 'bg-purple-soft text-purple' },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { formatMoney } = useSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="card p-6 sm:p-8">
        <BrandLogo />

        <h1 className="mt-6 text-2xl font-semibold text-gray-900">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {[user.designation, user.email].filter(Boolean).join(' · ')}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SWATCHES.map((swatch) => (
            <div key={swatch.label} className={`rounded-xl px-4 py-3 text-sm font-medium ${swatch.className}`}>
              {swatch.label}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-gray-700">
          Money formatting check: <span className="font-semibold tabular-nums">{formatMoney(12500050)}</span>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          The frontend setup is working. The full dashboard with cards and charts is built in Phase 17.
        </p>

        <Button variant="secondary" icon={LogOut} onClick={logout} className="mt-6">
          Log out
        </Button>
      </div>
    </div>
  );
}
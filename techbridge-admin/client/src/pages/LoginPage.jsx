import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, Eye, EyeOff, FileCheck2, Lock, Mail, ShieldCheck, Wallet } from 'lucide-react';
import BrandLogo from '../components/layout/BrandLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { loginSchema } from '../schemas/authSchemas.js';
import { applyServerErrors } from '../utils/formErrors.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const FEATURES = [
  { icon: Wallet, title: 'Clear finances', text: 'Deals, payments and staff commission in one place.' },
  { icon: FileCheck2, title: 'Branded documents', text: 'Invoices, receipts and statements with signature and stamp.' },
  { icon: ShieldCheck, title: 'Verifiable PDFs', text: 'Every document carries a QR code that proves it is genuine.' },
];

export default function LoginPage() {
      usePageTitle('Sign in');
  const { login } = useAuth();
  const { branding } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (error) {
      // Field errors go under the fields; anything else (wrong password, too many attempts) on top
      if (!applyServerErrors(error, setError)) setFormError(error.message);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel (large screens) */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand p-12 text-brand-contrast lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-black/10" aria-hidden="true" />

        <BrandLogo size="lg" inverted className="relative" />

        <div className="relative max-w-md">
          <h1 className="text-3xl leading-tight font-semibold">{branding.companyName} Admin Panel</h1>
          {branding.tagline && <p className="mt-3 text-base opacity-80">{branding.tagline}</p>}

          <ul className="mt-10 space-y-6">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm opacity-75">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs opacity-70">
          &copy; {new Date().getFullYear()} {branding.companyName}
        </p>
      </aside>

      {/* Form */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandLogo />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900">Sign in</h2>
          <p className="mt-1 text-sm text-gray-500">Admins only. Use the email and password given to you.</p>

          {formError && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
              leftIcon={Mail}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              leftIcon={Lock}
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              }
              {...register('password')}
            />

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
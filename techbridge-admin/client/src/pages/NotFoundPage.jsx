import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">The page you are looking for does not exist or has been moved.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:bg-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>
    </div>
  );
}
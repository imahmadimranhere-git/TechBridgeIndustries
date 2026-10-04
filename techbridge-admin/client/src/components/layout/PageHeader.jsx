import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn.js';

/** Title row at the top of every page, with optional back link and action buttons */
export default function PageHeader({ title, description, actions, backTo, backLabel = 'Back', children, className }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {backTo && (
          <Link to={backTo} className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </Link>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
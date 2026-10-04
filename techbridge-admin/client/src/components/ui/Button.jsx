import { forwardRef } from 'react';
import { cn } from '../../utils/cn.js';
import Spinner from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-brand text-brand-contrast shadow-sm hover:bg-brand-600 focus-visible:ring-brand/40',
  secondary: 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:ring-brand/30',
  danger: 'bg-danger text-white shadow-sm hover:bg-red-700 focus-visible:ring-danger/40',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-brand/30',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-base',
};

/**
 * <Button variant="primary|secondary|danger|ghost" size="sm|md|lg" icon={Plus} loading>
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading = false, disabled, type = 'button', className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export default Button;
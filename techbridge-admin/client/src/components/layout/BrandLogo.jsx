import { useSettings } from '../../context/SettingsContext.jsx';
import { cn } from '../../utils/cn.js';
import { initialsOf } from '../../utils/initials.js';

const SIZES = {
  sm: { badge: 'size-8 text-xs', name: 'text-sm', image: 'h-8' },
  md: { badge: 'size-10 text-sm', name: 'text-base', image: 'h-10' },
  lg: { badge: 'size-12 text-base', name: 'text-xl', image: 'h-12' },
};

/**
 * Company logo from Settings, or a text logo (initials badge + name) when none is uploaded.
 * inverted: for use on a brand-coloured background.
 */
export default function BrandLogo({ size = 'md', showName = true, inverted = false, className }) {
  const { branding } = useSettings();
  const styles = SIZES[size];

  if (branding.logoUrl) {
    return (
      <div className={cn('flex items-center', className)}>
        <img
          src={branding.logoUrl}
          alt={branding.companyName}
          className={cn(styles.image, 'w-auto max-w-[200px] object-contain', inverted && 'rounded-lg bg-white p-1.5')}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl font-bold tracking-wide',
          styles.badge,
          inverted ? 'bg-white text-brand' : 'bg-brand text-brand-contrast'
        )}
      >
        {initialsOf(branding.companyName)}
      </span>
      {showName && (
        <span className={cn('font-semibold tracking-tight', styles.name, inverted ? 'text-brand-contrast' : 'text-gray-900')}>
          {branding.companyName}
        </span>
      )}
    </div>
  );
}
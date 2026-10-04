import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext.jsx';
import { cn } from '../../utils/cn.js';
import BrandLogo from './BrandLogo.jsx';
import { NAV_SECTIONS } from './navigation.js';

function SidebarContent({ onNavigate }) {
  const { branding } = useSettings();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-gray-100 px-5">
        <BrandLogo size="sm" />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        'focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none',
                        isActive ? 'bg-brand-50 text-brand' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn('size-4.5 shrink-0', isActive ? 'text-brand' : 'text-gray-400 group-hover:text-gray-600')}
                          aria-hidden="true"
                        />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} {branding.companyName}
      </div>
    </div>
  );
}

/** Fixed sidebar on desktop (lg and up), slide-over drawer on mobile */
export default function Sidebar({ mobileOpen, onMobileClose }) {
  return (
    <>
      <aside className="hidden border-r border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64">
        <SidebarContent />
      </aside>

      <Dialog open={mobileOpen} onClose={onMobileClose} className="relative z-50 lg:hidden">
        <DialogBackdrop transition className="fixed inset-0 bg-gray-900/40 transition-opacity duration-200 data-closed:opacity-0" />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative flex w-full max-w-xs bg-white shadow-xl transition duration-200 ease-out data-closed:-translate-x-full"
          >
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              className="absolute top-3.5 right-3 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SidebarContent onNavigate={onMobileClose} />
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
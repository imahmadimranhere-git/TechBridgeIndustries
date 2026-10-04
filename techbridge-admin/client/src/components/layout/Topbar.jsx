import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDown, LogOut, Menu as MenuIcon, Settings, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { initialsOf } from '../../utils/initials.js';
import BrandLogo from './BrandLogo.jsx';

const ITEM = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 data-focus:bg-gray-50';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="-ml-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none lg:hidden"
      >
        <MenuIcon className="size-5" aria-hidden="true" />
      </button>

      <div className="lg:hidden">
        <BrandLogo size="sm" showName={false} />
      </div>

      <div className="flex-1" />

      <Menu>
        <MenuButton className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-gray-50 focus:outline-none data-focus:ring-2 data-focus:ring-brand/40">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-contrast">
            {initialsOf(user?.name ?? '')}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-gray-900">{user?.name}</span>
            <span className="block text-xs text-gray-500">{user?.designation || 'Admin'}</span>
          </span>
          <ChevronDown className="hidden size-4 text-gray-400 sm:block" aria-hidden="true" />
        </MenuButton>

        <MenuItems
          anchor="bottom end"
          transition
          className="z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-lg transition duration-100 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <div className="my-1 h-px bg-gray-100" />
          <MenuItem>
            <Link to="/profile" className={ITEM}>
              <UserCircle className="size-4 text-gray-400" aria-hidden="true" />
              My Profile
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/settings" className={ITEM}>
              <Settings className="size-4 text-gray-400" aria-hidden="true" />
              Settings
            </Link>
          </MenuItem>
          <div className="my-1 h-px bg-gray-100" />
          <MenuItem>
            <button type="button" onClick={logout} className={`${ITEM} text-danger data-focus:bg-danger-soft`}>
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </header>
  );
}
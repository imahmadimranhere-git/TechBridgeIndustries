import {
  BarChart3,
  Briefcase,
  FileText,
  HandCoins,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  StickyNote,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

// Sidebar menu. Pages that are not built yet show "Page not found" until Phase 17.
export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Business',
    items: [
      { to: '/clients', label: 'Clients', icon: Users },
      { to: '/deals', label: 'Deals', icon: Briefcase },
      { to: '/invoices', label: 'Invoices', icon: FileText },
      { to: '/payments', label: 'Payments', icon: Wallet },
    ],
  },
  {
    title: 'Team',
    items: [
      { to: '/staff', label: 'Staff', icon: UserCog },
      { to: '/payouts', label: 'Commission Payouts', icon: HandCoins },
      { to: '/notes', label: 'Notes', icon: StickyNote },
    ],
  },
  {
    title: 'Insights',
    items: [{ to: '/reports', label: 'Reports', icon: BarChart3 }],
  },
  {
    title: 'System',
    items: [
      { to: '/users', label: 'Admin Users', icon: ShieldCheck },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];
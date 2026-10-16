import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, Database, LogOut, Users2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { initials } from '../lib/utils';

export default function Shell({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();

  // A registrar's whole job is the door: services and check-in. The member
  // database and user management are admin surfaces.
  const tabs = [
    { to: '/services', label: 'Services', icon: CalendarDays },
    ...(isAdmin
      ? [
          { to: '/database', label: 'Database', icon: Database },
          { to: '/users', label: 'Users', icon: Users2 },
        ]
      : []),
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
      isActive ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'
    }`;

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:h-16">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-mark.svg"
              alt=""
              width={409}
              height={204}
              className="h-6 w-auto shrink-0 sm:h-7"
            />
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight text-ink-900">HE IS</p>
              <p className="text-[11px] font-medium text-ink-500">Registration</p>
            </div>
          </div>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            {tabs.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold text-ink-900">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                {profile?.role}
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
              {initials(profile?.full_name || profile?.email || '?')}
            </span>
            <button
              onClick={() => {
                if (window.confirm('Sign out of HE IS on this device?')) void signOut();
              }}
              className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      {/* Mobile tab bar — a registration desk runs on phones. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${
                  isActive ? 'text-brand-600' : 'text-ink-500'
                }`
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { useAgentSocket } from '@/lib/hooks/useSocket';
import { agentAuthApi } from '@/lib/services/api';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/brand-logo';
import { LogoutConfirmDialog } from '@/components/ui/logout-confirm-dialog';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Briefcase,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';

const AVAIL_CFG: Record<string, { label: string; dot: string; note: string }> = {
  AVAILABLE: { label: 'Available',  dot: 'bg-green-500',  note: 'You are available and can receive new case assignments.' },
  BUSY:      { label: 'Busy',       dot: 'bg-amber-500',  note: 'You are busy — admins will see reduced capacity for assignments.' },
  OFFLINE:   { label: 'Offline',    dot: 'bg-muted-foreground', note: 'You appear offline. You will not receive new assignments.' },
  ON_LEAVE:  { label: 'On Leave',   dot: 'bg-blue-500',   note: 'You are on leave. Assignments will be paused.' },
};

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: '/agent/dashboard',            label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/agent/dashboard/cases',      label: 'My Cases',  icon: Briefcase },
  { href: '/agent/dashboard/calendar',   label: 'Calendar',  icon: CalendarDays },
  { href: '/agent/dashboard/profile',    label: 'Profile',   icon: User },
  { href: '/agent/dashboard/settings',   label: 'Settings',  icon: Settings },
];

export default function AgentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { agent, isLoading, isAuthenticated, logout } = useAgentAuth();
  useAgentSocket(); // keep socket alive for real-time updates
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Availability dropdown
  const [availability, setAvailability] = useState(agent?.availability || 'AVAILABLE');
  const [availOpen, setAvailOpen] = useState(false);
  const [updatingAvail, setUpdatingAvail] = useState(false);
  const availRef = useRef<HTMLDivElement>(null);

  // Sync availability when agent loads
  useEffect(() => {
    if (agent?.availability) setAvailability(agent.availability);
  }, [agent?.availability]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (availRef.current && !availRef.current.contains(e.target as Node)) setAvailOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateAvailability = async (val: string) => {
    setAvailOpen(false);
    if (val === availability) return;
    setUpdatingAvail(true);
    try {
      await agentAuthApi.updateProfile({ availability: val });
      setAvailability(val);
      toast.success(`Status set to ${AVAIL_CFG[val]?.label ?? val}`);
      // Notify the calendar page so its live timer updates without a reload
      window.dispatchEvent(new CustomEvent('aux-changed', {
        detail: { status: val, changedAt: new Date().toISOString() },
      }));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setUpdatingAvail(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/agent/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Only show the full-screen spinner on the very first load
  if (isLoading && !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo + theme toggle */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <BrandLogo size="medium" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Nav label */}
      <div className="flex items-center gap-2 px-5 pt-2 pb-1.5">
        <ChevronUp className="size-3 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Navigation
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                active
                  ? 'bg-secondary font-semibold text-foreground'
                  : 'font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Icon className={`size-[18px] shrink-0 ${active ? 'text-primary' : ''}`} />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
          {agent?.fullName?.[0]?.toUpperCase() || 'A'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight text-foreground">
            {agent?.fullName || 'Agent'}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{agent?.employeeId}</p>
        </div>
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          title="Log out"
          aria-label="Log out"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop fixed sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:block">{sidebar}</div>

      {/* Mobile slide-in sidebar */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
        <div
          className={`absolute inset-y-0 left-0 transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebar}
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-h-screen flex-col md:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden inline-flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="md:hidden">
              <BrandLogo size="small" />
            </div>
            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {/* Availability dropdown */}
              <div ref={availRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAvailOpen((o) => !o)}
                  disabled={updatingAvail}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${AVAIL_CFG[availability]?.dot ?? 'bg-muted-foreground'}`} />
                  {AVAIL_CFG[availability]?.label ?? availability}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {availOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 rounded-md border border-border bg-card shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Set Availability</p>
                    </div>
                    {Object.entries(AVAIL_CFG).map(([val, cfg]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateAvailability(val)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] hover:bg-muted/50 transition-colors ${availability === val ? 'bg-muted/30 font-semibold text-foreground' : 'text-muted-foreground'}`}
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{cfg.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight truncate">{cfg.note}</p>
                        </div>
                        {availability === val && <span className="ml-auto text-primary text-[10px] font-bold shrink-0">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Profile avatar */}
              <Link
                href="/agent/dashboard/profile"
                className="flex size-9 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground hover:ring-2 hover:ring-primary/30 transition-all"
                title={`${agent?.fullName || 'Agent'} — view profile`}
              >
                {agent?.fullName?.[0]?.toUpperCase() || 'A'}
              </Link>
            </div>
          </div>
        </header>

        {/* Availability note strip — only shown when not Available */}
        {availability !== 'AVAILABLE' && (
          <div className={`px-4 sm:px-6 lg:px-8 py-2 text-[11px] font-medium flex items-center gap-2 border-b border-border ${
            availability === 'BUSY'     ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' :
            availability === 'ON_LEAVE' ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
            'bg-muted/60 text-muted-foreground'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${AVAIL_CFG[availability]?.dot ?? 'bg-muted-foreground'}`} />
            {AVAIL_CFG[availability]?.note}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={logout} />
    </div>
  );
}

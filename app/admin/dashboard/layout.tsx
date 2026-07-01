'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { LogoutConfirmDialog } from '@/components/ui/logout-confirm-dialog';
import ForcedPasswordChange from '@/components/admin/forced-password-change';
import PageTransition from '@/components/ui/page-transition';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  LogOut,
  UserCheck,
  DollarSign,
  ShieldCheck,
  ScrollText,
  Menu,
  X,
  ChevronUp,
  Building2,
  DatabaseZap,
  FileText,
  FolderTree,
  IndianRupee,
  Receipt,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react';
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  superOnly?: boolean;
  badge?: number;
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin, isLoading, isAuthenticated, logout, pendingAgents } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Only block with a spinner on the very first load (no admin yet).
  // If admin is already in context (back navigation, re-render) skip straight to the layout.
  if (isLoading && !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // First login with a temporary password — block the panel until it's changed.
  if (admin?.mustChangePassword) {
    return (
      <ForcedPasswordChange />
    );
  }

  const isSuper = admin?.role === 'SUPER_ADMIN';
  const pendingCount = pendingAgents?.length || 0;
  const roleLabel = (admin?.role || 'ADMIN').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const NAV: NavItem[] = [
    { href: '/admin/dashboard',                 label: 'Dashboard',       icon: LayoutDashboard, exact: true },
    { href: '/admin/dashboard/agents',          label: 'Agents',          icon: Users,        badge: pendingCount },
    { href: '/admin/dashboard/approvals',       label: 'Approvals',       icon: UserCheck,    badge: pendingCount },
    { href: '/admin/dashboard/cases',           label: 'Cases',           icon: Briefcase },
    { href: '/admin/dashboard/payment-requests', label: 'Payment Requests', icon: Receipt },
    { href: '/admin/dashboard/msme-users',      label: 'MSME Users',      icon: Building2 },
    { href: '/admin/dashboard/ai-usage',        label: 'AI Usage & Cost', icon: DollarSign },
    { href: '/admin/dashboard/ai-engine-tester', label: 'Engine Test Lab', icon: FlaskConical },
    { href: '/admin/dashboard/scheme-ingestion', label: 'Scheme Ingestion', icon: DatabaseZap },
    { href: '/admin/dashboard/schemes',          label: 'Schemes',          icon: FileText },
    { href: '/admin/dashboard/categories',       label: 'Categories',       icon: FolderTree },
    { href: '/admin/dashboard/pricing',          label: 'Pricing',          icon: IndianRupee },
    { href: '/admin/dashboard/admins',          label: 'Admins',          icon: ShieldCheck,  superOnly: true },
    { href: '/admin/dashboard/audit',           label: 'Audit Log',       icon: ScrollText,   superOnly: true },
    { href: '/admin/dashboard/settings',        label: 'Settings',        icon: Settings },
  ].filter((item) => !item.superOnly || isSuper);

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
              {item.badge ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
          {admin?.fullName?.[0]?.toUpperCase() || 'A'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight text-foreground">
            {admin?.fullName || 'Admin'}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
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
        {/* Clean top bar — role + profile icon only */}
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

            {/* Role + profile icon */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {roleLabel}
              </span>
              <Link
                href="/admin/dashboard/profile"
                className="flex size-9 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground hover:ring-2 hover:ring-primary/30 transition-all"
                title={`${admin?.fullName || 'Admin'} · ${roleLabel} — view profile`}
              >
                {admin?.fullName?.[0]?.toUpperCase() || 'A'}
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={logout} />
    </div>
  );
}

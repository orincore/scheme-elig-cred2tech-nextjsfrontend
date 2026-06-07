'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import BusinessSwitcher from '@/components/dashboard/BusinessSwitcher';
import { LogoutConfirmDialog } from '@/components/ui/logout-confirm-dialog';
import {
  LayoutGrid,
  Bookmark,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  ChevronUp,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Discover Schemes', icon: LayoutGrid, exact: true },
  { href: '/saved-schemes', label: 'Saved Schemes', icon: Bookmark },
  { href: '/track-applications', label: 'Track Applications', icon: FileText },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/profile', label: 'Profile', icon: User },
];

function initialsOf(name?: string | null) {
  if (!name) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── Gender-specific DiceBear avatar configs ───────────────────────────────────
// Verified hair values from api.dicebear.com/9.x/personas/schema.json:
// All options: long, sideShave, shortCombover, curlyHighTop, bobCut, curly,
//   pigtails, curlyBun, buzzcut, bobBangs, bald, balding, cap, bunUndercut,
//   fade, beanie, straightBun, extraLong, shortComboverChops, mohawk
//
// Male-presenting:  buzzcut, bald, balding, cap, fade, sideShave,
//                   shortCombover, shortComboverChops, mohawk
// Female-presenting: long, extraLong, curly, curlyBun, curlyHighTop,
//                    pigtails, bobCut, bobBangs, bunUndercut, straightBun
// Transgender:       mix (default random) + pride-flag gradient background

function buildAvatarUrl(seed: string, gender?: string | null): string {
  const s    = encodeURIComponent(seed);
  const base = 'https://api.dicebear.com/9.x';

  if (gender === 'Male') {
    // Masculine hair styles + raised facial hair probability for clear differentiation
    return `${base}/personas/svg?seed=${s}`
      + `&hair=buzzcut,bald,balding,cap,fade,sideShave,shortCombover,shortComboverChops,mohawk`
      + `&facialHairProbability=60`
      + `&backgroundColor=1d4ed8&backgroundType=solid`;
  }
  if (gender === 'Female') {
    // Feminine hair styles + facialHairProbability=0 explicitly removes mustache/beard
    return `${base}/personas/svg?seed=${s}`
      + `&hair=long,extraLong,curly,curlyBun,curlyHighTop,pigtails,bobCut,bobBangs,bunUndercut,straightBun`
      + `&facialHairProbability=0`
      + `&backgroundColor=be185d&backgroundType=solid`;
  }
  if (gender === 'Transgender') {
    // Transgender flag colours: pink → indigo gradient, no facial hair
    return `${base}/personas/svg?seed=${s}`
      + `&facialHairProbability=0`
      + `&backgroundColor=f472b6,818cf8&backgroundType=gradientLinear&backgroundRotation=135`;
  }
  // Default / not set — indigo lorelei (original style)
  return `${base}/lorelei/svg?seed=${s}&backgroundColor=4f46e5&backgroundType=solid`;
}

function UserAvatar({ name, mobile, gender }: { name?: string | null; mobile?: string | null; gender?: string | null }) {
  const [failed, setFailed] = useState(false);
  const seed       = name || mobile || 'user';
  const avatarUrl  = buildAvatarUrl(seed, gender);

  if (failed) {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground select-none">
        {initialsOf(name)}
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={name || 'User avatar'}
      width={36}
      height={36}
      className="size-9 shrink-0 rounded-full object-cover ring-2 ring-primary/20 bg-primary/10"
      onError={() => setFailed(true)}
    />
  );
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { logout, userProfile, token, mobile } = useMsmeAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [gender, setGender] = useState<string | null>(null);

  // Fetch gender once when token + mobile are ready
  useEffect(() => {
    const mobileNum = userProfile?.mobile || mobile;
    if (!token || !mobileNum) return;
    fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNum}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success && d.user?.gender) setGender(d.user.gender); })
      .catch(() => {});
  }, [token, userProfile?.mobile, mobile]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-card border-r border-border">
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
      <div className="flex items-center gap-3 border-t border-border px-4 py-4">
        <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setMobileOpen(false)}>
          <UserAvatar name={userProfile?.name} mobile={userProfile?.mobile} gender={gender} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold leading-tight text-foreground">
              {userProfile?.name || 'Your account'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {userProfile?.email || userProfile?.mobile || 'View profile'}
            </p>
          </div>
        </Link>
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
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs font-medium text-muted-foreground whitespace-nowrap">
                You are managing:
              </span>
              <BusinessSwitcher />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={logout} />
    </div>
  );
}

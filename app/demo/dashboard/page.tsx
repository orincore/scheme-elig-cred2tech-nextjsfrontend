'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { adminAuthApi } from '@/lib/services/api';
import {
  SchemesContext,
  SchemesContextType,
  SchemeDecisionItem,
  EligibilityQuestion,
} from '@/contexts/SchemesContext';
import SchemeDecisionCard from '@/components/dashboard/SchemeDecisionCard';
import QuestionsModal from '@/components/dashboard/QuestionsModal';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid, Bookmark, FileText, User, ReceiptText, Menu, X, ChevronUp,
  CheckCircle2, XCircle, HelpCircle, Target, Loader2, ScanSearch, Lock,
  ShieldCheck, BadgePercent, Landmark, Award, Building2, Sparkles,
  AlertCircle, RefreshCw, LogOut, type LucideIcon,
} from 'lucide-react';

const DEMO_MOBILE = '8830948511';

// Intercepts any /scheme/<slug> link inside SchemeDecisionCard and rewrites it
// to /demo/scheme/<slug> so the demo scheme page opens instead of the real one.
function DemoCardWrapper({ item }: { item: SchemeDecisionItem }) {
  const router = useRouter();
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (href.startsWith('/scheme/')) {
      e.preventDefault();
      router.push(href.replace('/scheme/', '/demo/scheme/'));
    }
  };
  return (
    <div onClick={handleClick}>
      <SchemeDecisionCard item={item} />
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'loading' | 'analyzing' | 'locked' | 'unlocked';
type VKey = 'ELIGIBLE' | 'ACTIONABLE' | 'NEEDS_INFO' | 'INELIGIBLE';
type ByVerdict = Record<VKey, SchemeDecisionItem[]>;

// ─── Stateful DemoSchemesProvider ────────────────────────────────────────────
// Provides a real SchemesContext value so SchemeDecisionCard and QuestionsModal
// work without modification. Save/bookmark/re-verify are no-ops in demo mode.

function DemoSchemesProvider({
  children,
  questions,
  isSubmittingAnswers,
  onSubmitAnswers,
}: {
  children: React.ReactNode;
  questions: EligibilityQuestion[];
  isSubmittingAnswers: boolean;
  onSubmitAnswers: (answers: Record<string, string>) => Promise<void>;
}) {
  const value: SchemesContextType = {
    schemes: [], savedSchemes: [], searchQuery: '', isLoading: false,
    currentPage: 1, itemsPerPage: 20, missingFields: [], showMissingFieldsModal: false,
    needsIndustry: false, industryOptions: [],
    analysisStatus: 'complete', analysisError: null,
    analysisProgress: { checked: 0, total: 0, eligible: 0 },
    eligibleItems: [], needsInfoItems: [], ineligibleItems: [], actionableItems: [],
    questions, isSubmittingAnswers, sessionId: null, lastUpdated: null,
    selectedFilters: { category: [], ministry: [], state: [], level: [], type: [], minInvestment: 0, maxInvestment: Infinity },
    filterOptions: { categories: [], ministries: [], states: [], levels: [], types: [] },
    setSearchQuery: () => {},
    setSelectedFilters: () => {},
    loadSchemesForDashboard: async () => {},
    searchSchemes: async () => {},
    submitMissingFields: async () => {},
    dismissMissingFieldsModal: () => {},
    saveScheme: async () => false,
    removeSavedScheme: () => {},
    getSavedSchemes: async () => {},
    getSchemeById: () => undefined,
    setCurrentPage: () => {},
    getTotalPages: () => 0,
    getFilteredSchemes: () => [],
    getSchemeDetailBySlug: async () => null,
    getSchemeDocuments: async () => [],
    getSchemeFaqs: async () => [],
    getSchemeApplicationProcess: async () => null,
    fetchSchemeBySlug: async () => null,
    refreshSchemes: async () => {},
    submitQuestionAnswers: onSubmitAnswers,
    submitSingleAnswer: async () => ({ ok: false }),
    submitIndustry: async () => {},
  };

  return (
    <SchemesContext.Provider value={value}>
      {children}
    </SchemesContext.Provider>
  );
}

// ─── Verdict theme ────────────────────────────────────────────────────────────

const VT = {
  ELIGIBLE:   { pill: 'text-emerald-700 bg-emerald-50 ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-900', dot: 'bg-emerald-500', label: 'Eligible',      Icon: CheckCircle2 },
  NEEDS_INFO: { pill: 'text-amber-700 bg-amber-50 ring-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:ring-amber-900',           dot: 'bg-amber-500',   label: 'Needs Info',    Icon: HelpCircle   },
  ACTIONABLE: { pill: 'text-indigo-700 bg-indigo-50 ring-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/30 dark:ring-indigo-900',     dot: 'bg-indigo-500',  label: 'Could Qualify', Icon: Target       },
  INELIGIBLE: { pill: 'text-slate-500 bg-slate-50 ring-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:ring-slate-800',              dot: 'bg-slate-400',   label: 'Not Eligible',  Icon: XCircle      },
} as const;

const TABS: VKey[] = ['ELIGIBLE', 'ACTIONABLE', 'NEEDS_INFO', 'INELIGIBLE'];
const TAB_LABEL: Record<VKey, string> = {
  ELIGIBLE: 'Eligible', ACTIONABLE: 'Could Qualify', NEEDS_INFO: 'Needs Info', INELIGIBLE: 'Not Eligible',
};

// ─── Demo sidebar ──────────────────────────────────────────────────────────────

const NAV: { label: string; icon: LucideIcon; href: string; exact?: boolean }[] = [
  { href: '/demo/dashboard', label: 'Discover Schemes',   icon: LayoutGrid, exact: true },
  { href: '/demo/saved',     label: 'Saved Schemes',      icon: Bookmark },
  { href: '/demo/track',     label: 'Track Applications', icon: FileText },
  { href: '/demo/txns',      label: 'Transactions',       icon: ReceiptText },
  { href: '/demo/profile',   label: 'Profile',            icon: User },
];

function Sidebar({ open, onClose, name, businessName }: {
  open: boolean; onClose: () => void; name: string; businessName: string;
}) {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'AS';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  return (
    <aside className="flex h-full w-64 flex-col bg-card border-r border-border">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <BrandLogo size="medium" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button type="button" onClick={onClose} className="md:hidden inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-5 pt-2 pb-1.5">
        <ChevronUp className="size-3 text-muted-foreground" />
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Navigation</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? currentPath === href : currentPath.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${active ? 'bg-secondary font-semibold text-foreground' : 'font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}>
              <Icon className={`size-[18px] shrink-0 ${active ? 'text-primary' : ''}`} />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 border-t border-border px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">{initials}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight text-foreground">{name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{businessName || 'Demo account'}</p>
        </div>
        <button type="button" title="Back to admin" onClick={() => { window.location.href = '/admin/dashboard'; }}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </aside>
  );
}

// ─── Celebration ──────────────────────────────────────────────────────────────

function CelebrationOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#f43f5e'];
  const particles = Array.from({ length: 46 }).map((_, i) => ({
    i, left: Math.random() * 100, delay: Math.random() * 1.3,
    duration: 2.6 + Math.random() * 2.4, size: 12 + Math.random() * 14, color: COLORS[i % COLORS.length],
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {particles.map(p => (
        <Sparkles key={p.i} className="celebrate-fall absolute -top-12"
          style={{ left: `${p.left}%`, width: p.size, height: p.size, color: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
      ))}
      <style>{`@keyframes celebrate-fall{0%{transform:translateY(-12vh) rotate(0deg);opacity:0}8%{opacity:1}100%{transform:translateY(112vh) rotate(360deg);opacity:0}}.celebrate-fall{animation-name:celebrate-fall;animation-timing-function:cubic-bezier(.37,.05,.5,.95);animation-iteration-count:1;animation-fill-mode:both;will-change:transform,opacity;}@media(prefers-reduced-motion:reduce){.celebrate-fall{display:none}}`}</style>
    </div>
  );
}

// ─── Teaser blur cards ─────────────────────────────────────────────────────────

const TEASER = [
  { name: 'Credit Linked Capital Subsidy Scheme (CLCSS)', ministry: 'Ministry of MSME', tag: 'Subsidy', Icon: BadgePercent },
  { name: 'Technology Upgradation Fund Scheme (TUFS)', ministry: 'Ministry of Textiles', tag: 'Subsidy', Icon: Award },
  { name: 'PM Employment Generation Programme (PMEGP)', ministry: 'Ministry of MSME', tag: 'Loan', Icon: Landmark },
  { name: 'Maharashtra Textile & Apparel Policy 2023–28', ministry: 'Govt. of Maharashtra', tag: 'State', Icon: BadgePercent },
  { name: 'SIDBI Direct Credit Scheme', ministry: 'Small Industries Dev. Bank of India', tag: 'Loan', Icon: Landmark },
  { name: 'ZED Certification Support Scheme', ministry: 'Quality Council of India / MSME', tag: 'Grant', Icon: Award },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifySnapshot(snap: any): ByVerdict {
  // Stored format uses camelCase (needsInfo); engine WS format uses snake_case (needs_info).
  const eligible   = snap.eligible   || [];
  const actionable = snap.actionable || [];
  const needsInfo  = snap.needsInfo  || snap.needs_info || [];
  const ineligible = snap.ineligible || [];

  if (eligible.length || actionable.length || needsInfo.length || ineligible.length) {
    return { ELIGIBLE: eligible, ACTIONABLE: actionable, NEEDS_INFO: needsInfo, INELIGIBLE: ineligible };
  }

  // Flat items array — split by verdict
  const items: SchemeDecisionItem[] = snap.items || snap.data?.items || [];
  const result: ByVerdict = { ELIGIBLE: [], ACTIONABLE: [], NEEDS_INFO: [], INELIGIBLE: [] };
  for (const item of items) {
    const v: VKey = (item.decision?.verdict as VKey) ?? 'INELIGIBLE';
    if (result[v]) result[v].push(item);
  }
  return result;
}

// Build EligibilityQuestion[] from NEEDS_INFO snapshot items so QuestionsModal
// fires exactly as it does during a real live analysis.
function extractQuestions(needsInfoItems: SchemeDecisionItem[]): EligibilityQuestion[] {
  const seen = new Set<string>();
  const questions: EligibilityQuestion[] = [];

  for (const item of needsInfoItems) {
    const clar = item.decision?.clarification;
    if (!clar?.field_id || !clar.question) continue;

    if (seen.has(clar.field_id)) {
      const existing = questions.find(q => q.field_id === clar.field_id);
      if (existing) existing.affectedSchemes.push({ slug: item.scheme.slug || '', schemeName: item.scheme.schemeName || '' });
      continue;
    }
    seen.add(clar.field_id);
    questions.push({
      field_id: clar.field_id,
      question: clar.question,
      why_needed: clar.why_needed,
      expected_format: clar.expected_format,
      options: clar.options,
      affectedSchemes: [{ slug: item.scheme.slug || '', schemeName: item.scheme.schemeName || '' }],
    });
  }
  return questions;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DemoDashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [statusLine, setStatusLine] = useState('');
  const [count, setCount] = useState(0);
  const [byVerdict, setByVerdict] = useState<ByVerdict>({ ELIGIBLE: [], ACTIONABLE: [], NEEDS_INFO: [], INELIGIBLE: [] });
  const [activeTab, setActiveTab] = useState<VKey>('ELIGIBLE');
  const [unlocking, setUnlocking] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [userName, setUserName] = useState('Adarsh Suradkar');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Questions state — fed into DemoSchemesProvider so QuestionsModal fires.
  // questionsRef mirrors it synchronously so runDemo's async loop can poll
  // without hitting stale closure values.
  const [questions, setQuestionsState] = useState<EligibilityQuestion[]>([]);
  const questionsRef = useRef<EligibilityQuestion[]>([]);
  const setQuestions = useCallback((qs: EligibilityQuestion[]) => {
    questionsRef.current = qs;
    setQuestionsState(qs);
  }, []);

  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);

  const counterRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitPollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Called by QuestionsModal when the user submits answers.
  // Fakes a 1.5 s re-check, then clears questions — the polling loop in
  // runDemo detects the empty ref and proceeds to the locked state.
  const handleSubmitAnswers = useCallback(async (_answers: Record<string, string>) => {
    setIsSubmittingAnswers(true);
    await delay(1500);
    setIsSubmittingAnswers(false);
    setQuestions([]);
  }, [setQuestions]);

  const runDemo = useCallback(async () => {
    if (counterRef.current) clearInterval(counterRef.current);
    if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
    if (waitPollRef.current) clearInterval(waitPollRef.current);
    setError(null);
    setQuestions([]);
    setPhase('loading');
    setStatusLine("Loading Adarsh Suradkar's profile…");
    setCount(0);

    try {
      // 1. Locate Adarsh by mobile
      await delay(1200);
      setStatusLine('Verifying your account…');
      await delay(900);
      setStatusLine('Searching user records…');
      const listRes = await adminAuthApi.listMsmeUsers({ search: DEMO_MOBILE, pageSize: 5 });
      if (!listRes?.success || !listRes.users?.length) {
        throw new Error(`Demo user (${DEMO_MOBILE}) not found. Make sure you are logged in to the admin panel.`);
      }
      const msmCode: string = listRes.users[0].msmCode || listRes.users[0].msm_code;

      // 2. Fetch stored eligibility snapshot (no AI credits used)
      setStatusLine('Loading your business profile…');
      await delay(1100);
      setStatusLine('Fetching eligibility results…');
      await delay(800);
      const snapRes = await adminAuthApi.getMsmeUserEligibilitySnapshot(msmCode);
      if (!snapRes?.success) throw new Error('Failed to load eligibility snapshot.');

      if (snapRes.user) {
        setUserName(snapRes.user.name || 'Adarsh Suradkar');
        setBusinessName(snapRes.user.businessName || '');
      }
      if (!snapRes.hasData || !snapRes.snapshot) {
        throw new Error('No eligibility results found for this user yet.');
      }

      const structured = classifySnapshot(snapRes.snapshot);

      // 3. Animated analysing phase — ~8 s total with rotating status messages
      setPhase('analyzing');
      setStatusLine('Shortlisting relevant government schemes…');

      // Rotate status messages to mimic the real engine scanning schemes
      const STATUS_MESSAGES = [
        { at: 1500, msg: 'Cross-referencing central scheme eligibility criteria…' },
        { at: 3200, msg: 'Checking state-level policies for Maharashtra…' },
        { at: 5000, msg: 'Verifying MSME registration and sector requirements…' },
        { at: 6500, msg: 'Finalising your eligibility report…' },
      ];
      const statusTimers: ReturnType<typeof setTimeout>[] = [];
      STATUS_MESSAGES.forEach(({ at, msg }) => {
        statusTimers.push(setTimeout(() => setStatusLine(msg), at));
      });

      // Fire questionnaire popup at ~3 s, after the first few status messages
      const qs = extractQuestions(structured.NEEDS_INFO);
      if (qs.length > 0) {
        questionTimerRef.current = setTimeout(() => {
          setStatusLine('A few quick questions will help unlock more schemes…');
          setQuestions(qs);
        }, 3000);
      }

      // Tick the eligible counter up over ~8 s
      const eligTotal = structured.ELIGIBLE.length;
      let cur = 0;
      await new Promise<void>(resolve => {
        counterRef.current = setInterval(() => {
          cur = Math.min(cur + 1, eligTotal);
          setCount(cur);
          if (cur >= eligTotal) { clearInterval(counterRef.current!); resolve(); }
        }, Math.max(80, Math.round(8000 / Math.max(eligTotal, 1))));
      });
      statusTimers.forEach(clearTimeout);
      await delay(600);

      // If questions are still open (user hasn't answered or dismissed yet),
      // pause here and wait. The poll resolves as soon as questionsRef empties
      // (answer submitted) OR after a 30 s safety timeout so demo never hangs.
      if (questionsRef.current.length > 0) {
        setStatusLine('Answer the questions above to check more schemes…');
        await new Promise<void>(resolve => {
          const start = Date.now();
          waitPollRef.current = setInterval(() => {
            if (questionsRef.current.length === 0 || Date.now() - start > 30_000) {
              clearInterval(waitPollRef.current!);
              waitPollRef.current = null;
              resolve();
            }
          }, 150);
        });
        await delay(400);
      }

      // Cancel question timer if it never fired (very fast counter)
      if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
      setQuestions([]);

      // Persist all scheme items so /demo/scheme/[id] can look them up without API calls
      try {
        const allItems = [
          ...structured.ELIGIBLE, ...structured.ACTIONABLE,
          ...structured.NEEDS_INFO, ...structured.INELIGIBLE,
        ];
        sessionStorage.setItem('demo_snapshot_items', JSON.stringify(allItems));
      } catch { /* sessionStorage full — ignore */ }

      setByVerdict(structured);
      setCelebrationActive(true);
      setTimeout(() => setCelebrationActive(false), 4200);
      setPhase('locked');
    } catch (e: any) {
      if (counterRef.current) clearInterval(counterRef.current);
      if (questionTimerRef.current) clearTimeout(questionTimerRef.current);
      if (waitPollRef.current) clearInterval(waitPollRef.current);
      setQuestions([]);
      setError(e.message || 'Something went wrong');
      setPhase('idle');
    }
  }, [setQuestions]);

  const handleUnlock = async () => {
    setUnlocking(true);
    await delay(1400);
    setUnlocking(false);
    setPhase('unlocked');
    setActiveTab('ELIGIBLE');
  };

  const eligibleCount = byVerdict.ELIGIBLE.length;
  const blurCount = Math.min(Math.max(eligibleCount, 4), 6);
  const displayBusiness = businessName || `${userName}'s Business`;

  const sidebar = (
    <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} name={userName} businessName={displayBusiness} />
  );

  return (
    <DemoSchemesProvider questions={questions} isSubmittingAnswers={isSubmittingAnswers} onSubmitAnswers={handleSubmitAnswers}>
      <div className="min-h-screen bg-background">
        <CelebrationOverlay active={celebrationActive} />

        {/* Desktop sidebar */}
        <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:block">{sidebar}</div>

        {/* Mobile sidebar */}
        <div className={`fixed inset-0 z-50 md:hidden transition-opacity ${mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className={`absolute inset-y-0 left-0 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>{sidebar}</div>
        </div>

        {/* Main column */}
        <div className="flex min-h-screen flex-col md:ml-64">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <button type="button" onClick={() => setMobileOpen(true)} className="md:hidden inline-flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary">
                <Menu className="size-5" />
              </button>
              <div className="md:hidden"><BrandLogo size="small" /></div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-xs font-medium text-muted-foreground">You are managing:</span>
                <span className="inline-flex items-center gap-2 border border-border bg-card rounded px-3 py-1.5 text-[13px] font-semibold text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {displayBusiness}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

              <div>
                <h1 className="text-2xl font-bold text-foreground">Your Scheme Eligibility</h1>
                <p className="text-sm text-muted-foreground mt-1">AI-matched government schemes for your business</p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-red-700 dark:text-red-400">{error}</p>
                    <p className="text-[12px] text-red-600/80 dark:text-red-400/70 mt-1">Make sure you&apos;re logged in to the admin panel.</p>
                  </div>
                </div>
              )}

              {/* ── IDLE ── */}
              {phase === 'idle' && (
                <div className="bg-card border border-border overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
                    <ScanSearch className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-[13px] font-bold text-foreground">Discover Eligible Schemes</h3>
                  </div>
                  <div className="px-5 py-6">
                    <h2 className="text-[17px] font-bold text-foreground">Discover the schemes you qualify for</h2>
                    <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                      Our AI scans 100+ government schemes against your full business profile to find every one you&apos;re eligible for.
                    </p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {[
                        { Icon: Landmark,   title: '100+ schemes',       sub: 'Central & state government' },
                        { Icon: ScanSearch, title: 'Full profile match',  sub: 'Checked against your business' },
                        { Icon: Award,      title: 'Eligibility reasons', sub: 'Know exactly why you qualify' },
                      ].map(({ Icon, title, sub }) => (
                        <div key={title} className="flex items-start gap-2.5">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">{title}</p>
                            <p className="text-[12px] text-muted-foreground">{sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button onClick={runDemo} className="mt-6 rounded-none gap-2">
                      <ScanSearch className="h-4 w-4" /> Analyse My Schemes
                    </Button>
                  </div>
                </div>
              )}

              {/* ── LOADING ── */}
              {phase === 'loading' && (
                <div className="bg-card border border-border overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                    <h3 className="text-[13px] font-bold text-foreground">Preparing Analysis</h3>
                  </div>
                  <div className="px-5 py-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                      <p className="text-sm text-foreground">{statusLine}</p>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── ANALYZING ── */}
              {phase === 'analyzing' && (
                <div className="bg-card border border-border overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
                    <ScanSearch className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-[13px] font-bold text-foreground">Analysing Your Profile</h3>
                  </div>
                  <div className="px-5 py-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                      <p className="text-sm text-foreground flex-1">{statusLine}</p>
                      <span className="text-sm font-semibold text-foreground tabular-nums">{count} eligible</span>
                    </div>
                    <Progress
                      value={byVerdict.ELIGIBLE.length > 0 ? Math.round((count / byVerdict.ELIGIBLE.length) * 85) + 6 : 6}
                      className="h-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-2">Checking against 100+ central and state schemes…</p>
                  </div>
                </div>
              )}

              {/* ── LOCKED ── */}
              {phase === 'locked' && (
                <>
                  <div className="bg-card border border-border overflow-hidden">
                    <div className="px-5 py-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
                        <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-400 mb-0.5">Congratulations</p>
                        <p className="text-[15px] font-bold leading-snug text-foreground">
                          You&apos;re eligible for{' '}
                          <span className="text-emerald-600 dark:text-emerald-400">{eligibleCount}</span>{' '}
                          {eligibleCount === 1 ? 'scheme' : 'schemes'}.
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                          Unlock to see exactly which schemes, your match reasons and how to apply.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Blurred teaser cards */}
                    <div className="grid md:grid-cols-2 gap-4 select-none pointer-events-none blur-[6px]" aria-hidden>
                      {Array.from({ length: blurCount }).map((_, i) => {
                        const c = TEASER[i % TEASER.length];
                        const Icon = c.Icon;
                        return (
                          <div key={i} className="bg-card border border-border p-5 space-y-3">
                            <div className="flex justify-between gap-3">
                              <p className="text-[15px] font-semibold text-foreground">{c.name}</p>
                              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-900">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Eligible
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Icon className="h-3.5 w-3.5" /> {c.ministry}
                            </div>
                            <div className="flex gap-2">
                              <span className="rounded bg-secondary px-2 py-0.5 text-[11px]">{c.tag}</span>
                              <span className="rounded bg-secondary px-2 py-0.5 text-[11px]">Central</span>
                            </div>
                            <p className="text-[13px] text-muted-foreground">You meet the core eligibility criteria based on your business profile.</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Paywall */}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="w-full max-w-md bg-card border border-border shadow-lg p-6 text-center">
                        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center border border-border bg-background">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                          Unlock your {eligibleCount} {eligibleCount === 1 ? 'scheme' : 'schemes'}
                        </h3>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          Get the full list with eligibility reasons, required documents and step-by-step guidance.
                        </p>
                        <Button onClick={handleUnlock} disabled={unlocking} size="lg" className="mt-5 w-full rounded-none">
                          {unlocking
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                            : 'Unlock now · ₹99'}
                        </Button>
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" /> Secure one-time payment · Powered by Razorpay
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── UNLOCKED ── */}
              {phase === 'unlocked' && (
                <>
                  {/* Summary tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TABS.map(v => {
                      const t = VT[v];
                      const Icon = t.Icon;
                      const cnt = byVerdict[v].length;
                      return (
                        <button key={v} onClick={() => setActiveTab(v)}
                          className={`text-left p-4 border transition-colors ${activeTab === v ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-secondary/30'}`}>
                          <Icon className={`h-5 w-5 mb-2 ${activeTab === v ? 'text-primary' : 'text-muted-foreground'}`} />
                          <p className="text-2xl font-bold text-foreground tabular-nums">{cnt}</p>
                          <p className="text-[12px] text-muted-foreground font-medium mt-0.5">{TAB_LABEL[v]}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab bar + cards */}
                  <div className="bg-card border border-border overflow-hidden">
                    <div className="flex border-b border-border bg-background overflow-x-auto">
                      {TABS.map(v => {
                        const t = VT[v];
                        const Icon = t.Icon;
                        const active = activeTab === v;
                        return (
                          <button key={v} onClick={() => setActiveTab(v)}
                            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-3.5 text-[12px] font-bold transition-colors border-b-2 px-3 ${active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                            <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
                            {TAB_LABEL[v]}
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ring-1 ${t.pill}`}>
                              {byVerdict[v].length}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-5">
                      {byVerdict[activeTab].length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground">
                          {(() => { const EmptyIcon = VT[activeTab].Icon; return <EmptyIcon className="h-8 w-8 mx-auto mb-3 opacity-30" />; })()}
                          <p className="text-sm font-semibold">No {TAB_LABEL[activeTab].toLowerCase()} schemes</p>
                          <p className="text-xs mt-1">Based on {userName}&apos;s current business profile</p>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {byVerdict[activeTab].map((item, i) => (
                            <DemoCardWrapper key={item.scheme?.slug || i} item={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => {
                      if (waitPollRef.current) clearInterval(waitPollRef.current);
                      setPhase('idle');
                      setByVerdict({ ELIGIBLE: [], ACTIONABLE: [], NEEDS_INFO: [], INELIGIBLE: [] });
                      setCount(0); setError(null); setCelebrationActive(false); setQuestions([]);
                    }}>
                      <RefreshCw className="h-3.5 w-3.5" /> Restart Demo
                    </Button>
                  </div>
                </>
              )}

            </div>
          </main>
        </div>

        {/* QuestionsModal — rendered inside DemoSchemesProvider so it reads the
            questions state we feed through context. Appears ~1.5 s into analysing,
            exactly as it does during a real live eligibility run. */}
        <QuestionsModal />
      </div>
    </DemoSchemesProvider>
  );
}

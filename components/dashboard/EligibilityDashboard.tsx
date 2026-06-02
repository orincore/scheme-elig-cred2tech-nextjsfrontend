'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchemes, SchemeDecisionItem } from '@/contexts/SchemesContext';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { getOwnedDocs, OwnedDocs } from '@/lib/documentMatch';
import { categorizeScheme, CATEGORY_ORDER } from '@/lib/schemeCategory';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SchemeDecisionCard from './SchemeDecisionCard';
import QuestionsModal from './QuestionsModal';
import {
  RefreshCw, CheckCircle2, HelpCircle, XCircle, Search, Loader2, Target, AlertTriangle,
  LayoutGrid, Landmark, Sprout, TrendingUp, BadgePercent, Award, ReceiptText,
  GraduationCap, Megaphone, Cpu, Layers, PartyPopper, type LucideIcon,
} from 'lucide-react';
import { Typewriter } from '@/components/ui/typewriter';

// Icon per benefit-type category, for the filter pills.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  all: LayoutGrid,
  loan: Landmark,
  seed: Sprout,
  equity: TrendingUp,
  subsidy: BadgePercent,
  award: Award,
  tax: ReceiptText,
  incubation: GraduationCap,
  market: Megaphone,
  tech: Cpu,
  other: Layers,
};

function filterItems(items: SchemeDecisionItem[], q: string): SchemeDecisionItem[] {
  if (!q.trim()) return items;
  const needle = q.toLowerCase();
  return items.filter(({ scheme }) =>
    (scheme.schemeName || '').toLowerCase().includes(needle) ||
    (scheme.briefDescription || '').toLowerCase().includes(needle) ||
    (scheme.nodalMinistryName || '').toLowerCase().includes(needle),
  );
}

function SkeletonCard() {
  return (
    <Card className="p-5 pl-6 space-y-3 border-border/60">
      <div className="flex justify-between gap-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/3" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/6" />
    </Card>
  );
}

function EmptyState({ icon: Icon, title, sub, spinning }: { icon: any; title: string; sub: string; spinning?: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center text-center py-16">
      <Icon className={`w-10 h-10 text-muted-foreground/40 mb-3 ${spinning ? 'animate-spin' : ''}`} />
      <p className="text-foreground font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{sub}</p>
    </div>
  );
}

const TabCount = ({ n, tone }: { n: number; tone: string }) => (
  <span className={`ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[11px] font-semibold ${tone}`}>{n}</span>
);

export default function EligibilityDashboard() {
  const {
    analysisStatus, analysisError, analysisProgress, lastUpdated,
    eligibleItems, needsInfoItems, ineligibleItems, actionableItems, isLoading, refreshSchemes,
  } = useSchemes();

  const { token, userProfile, mobile } = useMsmeAuth();
  const [ownedDocs, setOwnedDocs] = useState<OwnedDocs>(() => getOwnedDocs(null));

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('eligible');

  // Fetch the user's profile once to know which required documents they already hold.
  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const mobileNumber = userProfile?.mobile || mobile;
    if (!token || !mobileNumber) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setOwnedDocs(getOwnedDocs(data.user));
      } catch {
        /* non-fatal — cards just won't show "you have this" badges */
      }
    })();
  }, [token, userProfile, mobile]);

  const analyzing = analysisStatus === 'analyzing';
  const pct = analysisProgress.total > 0
    ? Math.min(100, Math.round((analysisProgress.checked / analysisProgress.total) * 100))
    : (analyzing ? 6 : 0);

  const fEligible = useMemo(() => filterItems(eligibleItems, query), [eligibleItems, query]);
  const fNeeds = useMemo(() => filterItems(needsInfoItems, query), [needsInfoItems, query]);
  const fIneligible = useMemo(() => filterItems(ineligibleItems, query), [ineligibleItems, query]);
  const fActionable = useMemo(() => filterItems(actionableItems, query), [actionableItems, query]);

  // Group eligible schemes into benefit-type categories (loans, grants, awards…)
  const [eligCat, setEligCat] = useState<string>('all');
  const eligibleGroups = useMemo(() => {
    const groups: Record<string, { label: string; items: SchemeDecisionItem[] }> = {};
    for (const item of fEligible) {
      const cat = categorizeScheme(item.scheme);
      if (!groups[cat.key]) groups[cat.key] = { label: cat.label, items: [] };
      groups[cat.key].items.push(item);
    }
    return CATEGORY_ORDER
      .filter((k) => groups[k]?.items.length)
      .map((k) => ({ key: k, label: groups[k].label, items: groups[k].items }));
  }, [fEligible]);

  const visibleGroups = eligCat === 'all' ? eligibleGroups : eligibleGroups.filter((g) => g.key === eligCat);

  const updatedLabel = lastUpdated && !analyzing
    ? new Date(lastUpdated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  // Celebratory message once analysis is done and there's something to celebrate.
  const firstName = (userProfile?.name || '').trim().split(/\s+/)[0] || '';
  const eligibleCount = eligibleItems.length;
  const showCongrats = !analyzing && analysisStatus !== 'error' && eligibleCount > 0;
  const congratsText = `Congratulations${firstName ? ` ${firstName}` : ''}! You're eligible for ${eligibleCount} ${eligibleCount === 1 ? 'scheme' : 'schemes'} to power your business growth.`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Your Scheme Eligibility
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-matched government schemes for your business{updatedLabel ? ` · updated ${updatedLabel}` : ''}
          </p>
        </div>
        <Button onClick={refreshSchemes} disabled={isLoading || analyzing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing…' : 'Re-run analysis'}
        </Button>
      </div>

      {/* Celebratory congratulations message */}
      {showCongrats && (
        <div className="elig-card-in relative overflow-hidden rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50 bg-linear-to-r from-indigo-50 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-[#162048] dark:to-indigo-950/20 p-5 sm:p-6">
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <PartyPopper className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] sm:text-[17px] font-bold leading-snug text-[#0a1628] dark:text-[#e6edf7]">
                <Typewriter text={congratsText} />
              </p>
              <p className="mt-1 text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">
                Explore them below, save the ones that fit, and start applying.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 right-16 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
        </div>
      )}

      {/* Live status strip */}
      {analyzing && (
        <Card className="relative overflow-hidden p-4 border-primary/30 bg-primary/5">
          <div className="elig-scanline" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2.5">
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              <p className="text-sm font-medium text-foreground flex-1">
                AI is matching government schemes against your full profile…
              </p>
              <span className="text-sm font-semibold text-primary tabular-nums">
                {analysisProgress.eligible} eligible
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-2">
              {analysisProgress.total > 0
                ? `Scanned ${Math.min(analysisProgress.checked, analysisProgress.total)} of ${analysisProgress.total} shortlisted schemes`
                : 'Shortlisting schemes…'}
            </p>
          </div>
        </Card>
      )}

      {analysisStatus === 'error' && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">{analysisError || 'Something went wrong while checking eligibility.'}</p>
          <Button size="sm" variant="outline" onClick={refreshSchemes}>Try again</Button>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search within your results…" className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="eligible" className="gap-1 text-xs sm:text-sm data-[state=active]:text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" /> 
            <span className="hidden sm:inline">Eligible</span>
            <span className="sm:hidden">Elig</span>
            <TabCount n={eligibleItems.length} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" />
          </TabsTrigger>
          <TabsTrigger value="needs" className="gap-1 text-xs sm:text-sm data-[state=active]:text-amber-700">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            <span className="hidden sm:inline">Needs info</span>
            <span className="sm:hidden">Needs</span>
            <TabCount n={needsInfoItems.length} tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" />
          </TabsTrigger>
          <TabsTrigger value="actionable" className="gap-1 text-xs sm:text-sm data-[state=active]:text-indigo-700">
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            <span className="hidden sm:inline">Could qualify</span>
            <span className="sm:hidden">Qualify</span>
            <TabCount n={actionableItems.length} tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" />
          </TabsTrigger>
          <TabsTrigger value="ineligible" className="gap-1 text-xs sm:text-sm">
            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            <span className="hidden sm:inline">Not eligible</span>
            <span className="sm:hidden">Inelig</span>
            <TabCount n={ineligibleItems.length} tone="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eligible" className="mt-5">
          {/* Category filter pills */}
          {eligibleGroups.length > 1 && (() => {
            const pills = [{ key: 'all', label: 'All schemes', count: fEligible.length }, ...eligibleGroups.map((g) => ({ key: g.key, label: g.label, count: g.items.length }))];
            return (
              <div className="flex flex-wrap gap-2 mb-6">
                {pills.map((p) => {
                  const active = eligCat === p.key;
                  const Icon = CATEGORY_ICON[p.key] || Layers;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setEligCat(p.key)}
                      className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                        active
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/25 dark:border-indigo-500 dark:bg-indigo-500'
                          : 'border-border bg-card text-muted-foreground hover:-translate-y-px hover:border-indigo-300 hover:text-foreground hover:shadow-sm dark:hover:border-indigo-700'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                      {p.label}
                      <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums ${
                        active ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:group-hover:bg-indigo-950/50 dark:group-hover:text-indigo-300'
                      }`}>
                        {p.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Grouped sections */}
          {visibleGroups.map((g) => (
            <section key={g.key} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-foreground">{g.label}</h3>
                <span className="text-xs text-muted-foreground">({g.items.length})</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {g.items.map((item) => <SchemeDecisionCard key={item.scheme.slug} item={item} ownedDocs={ownedDocs} />)}
              </div>
            </section>
          ))}

          {/* Skeletons while analyzing */}
          {analyzing && fEligible.length < 4 && (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 - fEligible.length }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
            </div>
          )}
          {!analyzing && fEligible.length === 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <EmptyState icon={CheckCircle2} title="No eligible schemes yet"
                sub="Answer any pending questions, or re-run the analysis to check again." />
            </div>
          )}
        </TabsContent>

        <TabsContent value="needs" className="mt-5">
          <div className="grid md:grid-cols-2 gap-4">
            {fNeeds.map((item) => <SchemeDecisionCard key={item.scheme.slug} item={item} ownedDocs={ownedDocs} />)}
            {fNeeds.length === 0 && (
              <EmptyState icon={analyzing ? Loader2 : HelpCircle} spinning={analyzing}
                title={analyzing ? 'Still analyzing…' : 'Nothing needs your input'}
                sub="Schemes that need one more detail from you will appear here with a quick question." />
            )}
          </div>
        </TabsContent>

        <TabsContent value="actionable" className="mt-5">
          <div className="grid md:grid-cols-2 gap-4">
            {fActionable.map((item) => <SchemeDecisionCard key={item.scheme.slug} item={item} ownedDocs={ownedDocs} />)}
            {fActionable.length === 0 && (
              <EmptyState icon={analyzing ? Loader2 : Target} spinning={analyzing}
                title={analyzing ? 'Still analyzing…' : 'No near-miss schemes yet'}
                sub="Schemes that you could qualify for with a few steps will appear here." />
            )}
          </div>
        </TabsContent>

        <TabsContent value="ineligible" className="mt-5">
          <div className="grid md:grid-cols-2 gap-4">
            {fIneligible.map((item) => <SchemeDecisionCard key={item.scheme.slug} item={item} ownedDocs={ownedDocs} />)}
            {fIneligible.length === 0 && (
              <EmptyState icon={analyzing ? Loader2 : XCircle} spinning={analyzing}
                title={analyzing ? 'Still analyzing…' : 'No ruled-out schemes yet'}
                sub="Schemes you don't qualify for — with the exact reason why — will appear here." />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Clarification questions popup + floating reminder */}
      <QuestionsModal />
    </div>
  );
}

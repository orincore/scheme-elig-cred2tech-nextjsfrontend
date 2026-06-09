'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSchemes, SchemeDecisionItem } from '@/contexts/SchemesContext';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { getOwnedDocs, OwnedDocs } from '@/lib/documentMatch';
import { resolveCategory, CATEGORY_ORDER, type DbCategory } from '@/lib/schemeCategory';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { payForService } from '@/lib/razorpayCheckout';
import { toast } from 'sonner';
import SchemeDecisionCard from './SchemeDecisionCard';
import QuestionsModal from './QuestionsModal';
import { generateEligibilityReport, generateEligibilityReportBytes, ReportScheme } from '@/lib/generateEligibilityReport';
import { msmeAuthApi, getPublicCategories } from '@/lib/services/api';
import {
  RefreshCw, CheckCircle2, HelpCircle, XCircle, Search, Loader2, Target, AlertTriangle,
  LayoutGrid, Landmark, Sprout, TrendingUp, BadgePercent, Award, ReceiptText,
  GraduationCap, Megaphone, Cpu, Layers, PartyPopper, FileDown, Mail, type LucideIcon,
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

  const { token, userId, userProfile, mobile, activeBusinessId, businesses } = useMsmeAuth();
  const [ownedDocs, setOwnedDocs] = useState<OwnedDocs>(() => getOwnedDocs(null));
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  const REPORT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
  const COOLDOWN_KEY = 'eligibility_report_sent_at';

  // minsLeft: how many full minutes remain in the cooldown (0 = no cooldown).
  const calcMinsLeft = () => {
    const sent = typeof window !== 'undefined' ? localStorage.getItem(COOLDOWN_KEY) : null;
    if (!sent) return 0;
    const remaining = REPORT_COOLDOWN_MS - (Date.now() - Number(sent));
    return remaining > 0 ? Math.ceil(remaining / 60_000) : 0;
  };
  const [reportMinsLeft, setReportMinsLeft] = useState<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bootstrap cooldown from localStorage on mount.
  useEffect(() => {
    setReportMinsLeft(calcMinsLeft());
  }, []);

  // When cooldown is active, tick every 30 s to keep the label current.
  useEffect(() => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    if (reportMinsLeft <= 0) return;
    cooldownTimerRef.current = setInterval(() => {
      const mins = calcMinsLeft();
      setReportMinsLeft(mins);
      if (mins <= 0 && cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    }, 30_000);
    return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
  }, [reportMinsLeft]);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('eligible');

  // ── Paid "Re-run analysis" ────────────────────────────────────────────────
  // Re-running is a paid action (in BOTH sandbox and live modes): confirm the
  // price, take payment, and only then trigger the re-analysis.
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false);
  const [reanalyzePrice, setReanalyzePrice] = useState<number | null>(null);
  const [reanalyzePaying, setReanalyzePaying] = useState(false);

  // Fetch the (admin-tunable) re-run price up front so the dialog can show it.
  useEffect(() => {
    const uid = userId || (typeof window !== 'undefined' ? sessionStorage.getItem('msme_user_id') : null);
    const authToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('msme_auth_token') : null);
    if (!uid || !authToken) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payment/status/${uid}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (data?.reanalysisPrice != null) setReanalyzePrice(Number(data.reanalysisPrice));
      } catch {
        /* dialog will still work; price just shows generically */
      }
    })();
  }, [userId, token]);

  const handleConfirmReanalyze = async () => {
    const authToken = token || sessionStorage.getItem('msme_auth_token') || '';
    const uid = userId || sessionStorage.getItem('msme_user_id') || '';
    const bizId = activeBusinessId ?? sessionStorage.getItem('msme_active_business') ?? undefined;

    // Close our modal BEFORE opening Razorpay. The Razorpay checkout must not be
    // launched from underneath an open overlay/focus-trap or it becomes
    // non-interactive — so we tear ours down first, then open the payment popup.
    setReanalyzePaying(true);
    setReanalyzeOpen(false);
    await new Promise((r) => setTimeout(r, 120));

    const result = await payForService({
      token: authToken,
      userId: uid,
      mobile: mobile || sessionStorage.getItem('msme_mobile') || undefined,
      paymentType: 'REANALYSIS',
      businessId: bizId,
      description: 'Re-run scheme analysis',
      prefillName: userProfile?.name,
      prefillEmail: userProfile?.email,
    });
    setReanalyzePaying(false);
    if (result.success) {
      toast.success('Payment successful — re-running analysis…');
      refreshSchemes();
    } else if (!result.cancelled) {
      toast.error(result.error || 'Payment failed. Please try again.');
    }
  };

  // ── Download eligible-schemes PDF report ──────────────────────────────────
  const handleDownloadReport = async () => {
    if (eligibleItems.length === 0) { toast.error('No eligible schemes to include yet'); return; }
    setDownloadingReport(true);
    try {
      const authToken = token || sessionStorage.getItem('msme_auth_token') || '';
      const mobileNumber = userProfile?.mobile || mobile || sessionStorage.getItem('msme_mobile') || '';
      const biz = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

      // Only NON-sensitive descriptive fields go into the report (no PAN / GSTIN
      // / phone / email). Pull sector/state/type from the merged-business profile.
      let sector: string | null = null, state: string | null = null;
      let type: string | null = null, enterpriseCategory: string | null = null;
      let legalName = biz?.legalNameOfBusiness || null;
      try {
        const res = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNumber}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const d = await res.json();
        if (d?.success && d.user) {
          sector = d.user.businessSector ?? null;
          state = d.user.state ?? null;
          type = d.user.businessType ?? null;
          enterpriseCategory = d.user.enterpriseCategory ?? null;
          legalName = legalName || d.user.legalNameOfBusiness || d.user.name || null;
        }
      } catch { /* report still works with what we have */ }

      const schemes: ReportScheme[] = eligibleItems.map(({ scheme, decision }) => ({
        name: scheme.schemeName || scheme.schemeShortTitle || 'Scheme',
        ministry: scheme.nodalMinistryName || null,
        level: scheme.level || scheme.schemeLevel || null,
        category: (scheme.schemeCategory || [])[0] || null,
        confidence: decision.confidence || null,
        briefDescription: scheme.briefDescription || null,
        whyEligible: (decision.verified_criteria?.length ? decision.verified_criteria : decision.reasons) || [],
        benefits: scheme.benefits || null,
        notes: decision.important_notes || null,
      }));

      await generateEligibilityReport({
        user: { name: userProfile?.name || null },
        business: { legalName, sector, state, type, enterpriseCategory },
        schemes,
      });
      toast.success('Report downloaded');
    } catch (err: any) {
      console.error('[Report] generation failed:', err);
      toast.error(err?.message || 'Could not generate the report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  // ── Send eligibility report to MSME email ─────────────────────────────────
  const handleSendReport = async () => {
    if (eligibleItems.length === 0) { toast.error('No eligible schemes to include yet'); return; }
    const authToken = token || sessionStorage.getItem('msme_auth_token') || '';
    if (!authToken) { toast.error('Please log in to send the report'); return; }
    setSendingReport(true);
    try {
      const mobileNumber = userProfile?.mobile || mobile || sessionStorage.getItem('msme_mobile') || '';
      const biz = businesses.find((b) => b.id === activeBusinessId) || businesses[0];

      let sector: string | null = null, state: string | null = null;
      let type: string | null = null, enterpriseCategory: string | null = null;
      let legalName = biz?.legalNameOfBusiness || null;
      try {
        const res = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNumber}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const d = await res.json();
        if (d?.success && d.user) {
          sector = d.user.businessSector ?? null;
          state = d.user.state ?? null;
          type = d.user.businessType ?? null;
          enterpriseCategory = d.user.enterpriseCategory ?? null;
          legalName = legalName || d.user.legalNameOfBusiness || d.user.name || null;
        }
      } catch { /* report still works with what we have */ }

      const schemes: ReportScheme[] = eligibleItems.map(({ scheme, decision }) => ({
        name: scheme.schemeName || scheme.schemeShortTitle || 'Scheme',
        ministry: scheme.nodalMinistryName || null,
        level: scheme.level || scheme.schemeLevel || null,
        category: (scheme.schemeCategory || [])[0] || null,
        confidence: decision.confidence || null,
        briefDescription: scheme.briefDescription || null,
        benefits: scheme.benefits || null,
        notes: decision.important_notes || null,
        whyEligible: (decision.verified_criteria?.length ? decision.verified_criteria : decision.reasons) || [],
      }));

      // Generate PDF bytes in the browser, then base64-encode for the API
      const pdfBytes = await generateEligibilityReportBytes({
        user: { name: userProfile?.name || null },
        business: { legalName, sector, state, type, enterpriseCategory },
        schemes,
      });
      let binary = '';
      for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);
      const pdfBase64 = btoa(binary);

      const res = await msmeAuthApi.sendEligibilityReport(authToken, schemes, pdfBase64);
      if (res?.success) {
        toast.success(res.message || 'Report sent to your email');
        localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        setReportMinsLeft(calcMinsLeft());
      } else {
        toast.error(res?.message || 'Could not send the report. Please try again.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not send the report. Please try again.');
    } finally {
      setSendingReport(false);
    }
  };

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

  // Admin-managed display categories (DB-driven). Empty until fetched → falls back
  // to pure keyword classification, so there is never a regression.
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  useEffect(() => {
    let alive = true;
    getPublicCategories()
      .then((res: any) => { if (alive && res?.success) setDbCategories(res.categories || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Group eligible schemes into benefit-type categories (loans, grants, awards…).
  // Uses each scheme's admin-assigned category when set, else auto-classifies.
  const [eligCat, setEligCat] = useState<string>('all');
  const eligibleGroups = useMemo(() => {
    const groups: Record<string, { label: string; items: SchemeDecisionItem[] }> = {};
    for (const item of fEligible) {
      const cat = resolveCategory(item.scheme, dbCategories);
      if (!groups[cat.key]) groups[cat.key] = { label: cat.label, items: [] };
      groups[cat.key].items.push(item);
    }
    // Order by the admin-defined category order first, then any leftover
    // (auto-classified) keys in the legacy static order, then anything else.
    const dbOrder = dbCategories.map((c) => c.key);
    const orderedKeys = [...dbOrder, ...CATEGORY_ORDER.filter((k) => !dbOrder.includes(k))];
    const seen = new Set<string>();
    const result: { key: string; label: string; items: SchemeDecisionItem[] }[] = [];
    for (const k of orderedKeys) {
      if (groups[k]?.items.length && !seen.has(k)) { seen.add(k); result.push({ key: k, label: groups[k].label, items: groups[k].items }); }
    }
    // Include any group whose key wasn't in either order list.
    for (const k of Object.keys(groups)) {
      if (!seen.has(k) && groups[k].items.length) { seen.add(k); result.push({ key: k, label: groups[k].label, items: groups[k].items }); }
    }
    return result;
  }, [fEligible, dbCategories]);

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
        <div className="flex items-center gap-2">
          {eligibleItems.length > 0 && (
            <>
              <Button onClick={handleDownloadReport} disabled={downloadingReport || analyzing} variant="outline">
                {downloadingReport
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing…</>
                  : <><FileDown className="w-4 h-4 mr-2" /> Download report</>}
              </Button>
              <Button onClick={handleSendReport} disabled={sendingReport || analyzing || reportMinsLeft > 0} variant="outline">
                {sendingReport
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                  : reportMinsLeft > 0
                    ? <><Mail className="w-4 h-4 mr-2" /> Sent ({reportMinsLeft}m)</>
                    : <><Mail className="w-4 h-4 mr-2" /> Send to email</>}
              </Button>
            </>
          )}
          <Button onClick={() => setReanalyzeOpen(true)} disabled={isLoading || analyzing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing…' : 'Re-run analysis'}
          </Button>
        </div>
      </div>

      {/* Paid re-run confirmation — matches the scheme-application "Upload
          Documents" dialog (sharp rounded-lg edges, bg-background, border-b/border-t
          sections). Kept as a plain overlay (NOT Radix) so the Razorpay popup
          launched afterwards stays fully interactive. */}
      {reanalyzeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { if (!reanalyzePaying) setReanalyzeOpen(false); }}
        >
          <div
            className="w-full max-w-md bg-background border border-border rounded-lg shadow-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <RefreshCw className="h-5 w-5" />
                Re-run Scheme Analysis
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This re-evaluates every government scheme against your latest profile.
                It’s a paid action and you’ll be charged before the analysis starts.
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium text-foreground">Re-Run Analysis</span>
                <span className="text-lg font-bold text-foreground">
                  {reanalyzePrice != null ? `₹${reanalyzePrice}` : '—'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border shrink-0 flex flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setReanalyzeOpen(false)}
                disabled={reanalyzePaying}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReanalyze}
                disabled={reanalyzePaying}
                className="gap-2 flex-1 sm:flex-initial"
              >
                {reanalyzePaying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Opening…</>
                ) : (
                  <>{reanalyzePrice != null ? `Pay ₹${reanalyzePrice} & Re-run` : 'Pay & Re-run'}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                sub="Schemes that need a quick answer appear here. Answer one and if you qualify it moves to the Eligible tab; otherwise it stays here so you can modify the answer and re-check." />
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

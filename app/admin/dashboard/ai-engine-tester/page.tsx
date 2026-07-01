'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Play, RotateCcw, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, HelpCircle, Zap, Loader2, FlaskConical,
  Info, Trash2, Copy, ChevronRight,
} from 'lucide-react';

const ENGINE_URL = process.env.NEXT_PUBLIC_ELIGIBILITY_URL || 'http://localhost:4000';

// ── Preset test cases ──────────────────────────────────────────────────────
const PRESETS = [
  {
    label: 'Manufacturing · SC · Male · Gujarat',
    profile: {
      businessSector: 'manufacturing', msmeType: 'small', businessType: 'pvt_ltd',
      businessStage: 'growth', annualTurnoverLakhs: 70, totalEmployees: 60,
      gender: 'Male', caste: 'SC', age: 38, state: 'Gujarat',
      udyamRegistered: true, gstRegistered: true, isStartup: false,
      benefitFocus: 'subsidy', disability: false, minority: false, isBpl: false,
    },
  },
  {
    label: 'Women-led Textile · OBC · Rajasthan',
    profile: {
      businessSector: 'textile', msmeType: 'micro', businessType: 'women_owned',
      businessStage: 'early', annualTurnoverLakhs: 15, totalEmployees: 8,
      gender: 'Female', caste: 'OBC', age: 32, state: 'Rajasthan',
      udyamRegistered: true, gstRegistered: false, isStartup: false, isWomenLed: true,
      benefitFocus: 'loan', disability: false, minority: false, isBpl: false,
    },
  },
  {
    label: 'Tech Startup · General · Bengaluru (Karnataka)',
    profile: {
      businessSector: 'technology', msmeType: 'startup', businessType: 'startup',
      businessStage: 'early', annualTurnoverLakhs: 40, totalEmployees: 12,
      gender: 'Male', caste: 'General', age: 27, state: 'Karnataka',
      udyamRegistered: false, gstRegistered: true, isStartup: true, isIncorporated: true,
      benefitFocus: 'technology', disability: false, minority: false, isBpl: false,
    },
  },
  {
    label: 'Agri Processing · ST · Odisha',
    profile: {
      businessSector: 'agro', msmeType: 'micro', businessType: 'proprietorship',
      businessStage: 'mature', annualTurnoverLakhs: 5, totalEmployees: 3,
      gender: 'Male', caste: 'ST', age: 45, state: 'Odisha',
      udyamRegistered: true, gstRegistered: false, isStartup: false,
      benefitFocus: 'subsidy', disability: false, minority: false, isBpl: false,
    },
  },
  {
    label: 'Handicraft · Minority · UP',
    profile: {
      businessSector: 'handicraft', msmeType: 'micro', businessType: 'proprietorship',
      businessStage: 'mature', annualTurnoverLakhs: 3, totalEmployees: 2,
      gender: 'Female', caste: 'General', age: 40, state: 'Uttar Pradesh',
      udyamRegistered: false, gstRegistered: false, isStartup: false,
      benefitFocus: 'loan', disability: false, minority: true, isBpl: false,
    },
  },
  {
    label: 'Export-oriented · Retail · Tamil Nadu',
    profile: {
      businessSector: 'retail', msmeType: 'medium', businessType: 'pvt_ltd',
      businessStage: 'mature', annualTurnoverLakhs: 800, totalEmployees: 200,
      gender: 'Male', caste: 'General', age: 50, state: 'Tamil Nadu',
      udyamRegistered: true, gstRegistered: true, isExportOriented: true,
      benefitFocus: 'marketing', disability: false, minority: false, isBpl: false,
    },
  },
];

// ── Field definitions ──────────────────────────────────────────────────────
type FieldDef = {
  key: string; label: string;
  type: 'select' | 'number' | 'text' | 'boolean';
  options?: { value: string | boolean | number; label: string }[];
  group: string;
};

const FIELDS: FieldDef[] = [
  // Business
  { key: 'businessSector', label: 'Business Sector', type: 'select', group: 'Business', options: [
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'technology', label: 'IT / Technology / ITES' },
    { value: 'retail', label: 'Retail / Trading / Wholesale' },
    { value: 'services', label: 'Other Services' },
    { value: 'finance', label: 'Finance / Fintech / Banking' },
    { value: 'healthcare', label: 'Healthcare & Pharma' },
    { value: 'education', label: 'Education & Training' },
    { value: 'construction', label: 'Construction & Real Estate' },
    { value: 'transport', label: 'Transportation & Logistics' },
    { value: 'agro', label: 'Agriculture / Food Processing' },
    { value: 'textile', label: 'Textile & Apparel' },
    { value: 'handicraft', label: 'Handicraft & Artisan' },
    { value: 'fisheries', label: 'Fisheries & Aquaculture' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'energy', label: 'Energy & Renewables' },
    { value: 'hospitality', label: 'Hospitality & Tourism' },
    { value: 'media', label: 'Media & Entertainment' },
  ]},
  { key: 'msmeType', label: 'MSME Size', type: 'select', group: 'Business', options: [
    { value: 'micro', label: 'Micro' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'startup', label: 'Startup' },
  ]},
  { key: 'businessType', label: 'Business Type / Constitution', type: 'select', group: 'Business', options: [
    { value: 'startup', label: 'Startup' },
    { value: 'proprietorship', label: 'Proprietorship / Sole Trader' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'pvt_ltd', label: 'Private Limited (Pvt Ltd / LLP)' },
    { value: 'cooperative', label: 'Cooperative' },
    { value: 'women_owned', label: 'Women-Owned Business' },
    { value: 'sc_st_owned', label: 'SC/ST-Owned Business' },
  ]},
  { key: 'businessStage', label: 'Business Stage', type: 'select', group: 'Business', options: [
    { value: 'idea', label: 'Idea Stage' },
    { value: 'early', label: 'Early (< 2 years)' },
    { value: 'growth', label: 'Growth (2–5 years)' },
    { value: 'mature', label: 'Mature / Established (5+ years)' },
  ]},
  { key: 'benefitFocus', label: 'Benefit Focus', type: 'select', group: 'Business', options: [
    { value: 'any', label: 'Any / All' },
    { value: 'loan', label: 'Loan / Credit / Finance' },
    { value: 'subsidy', label: 'Subsidy / Grant' },
    { value: 'training', label: 'Training / Skill Development' },
    { value: 'technology', label: 'Technology Upgradation' },
    { value: 'marketing', label: 'Marketing / Export Promotion' },
    { value: 'insurance', label: 'Insurance / Protection' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'tax', label: 'Tax Exemption' },
  ]},
  { key: 'annualTurnoverLakhs', label: 'Annual Turnover (₹ Lakhs)', type: 'number', group: 'Business' },
  { key: 'totalEmployees', label: 'Total Employees', type: 'number', group: 'Business' },

  // Registrations
  { key: 'udyamRegistered', label: 'Udyam Registered?', type: 'boolean', group: 'Registrations' },
  { key: 'gstRegistered', label: 'GST Registered?', type: 'boolean', group: 'Registrations' },
  { key: 'isIncorporated', label: 'Incorporated?', type: 'boolean', group: 'Registrations' },
  { key: 'isStartup', label: 'DPIIT-recognized Startup?', type: 'boolean', group: 'Registrations' },

  // Flags
  { key: 'isWomenLed', label: 'Women-Led Business?', type: 'boolean', group: 'Flags' },
  { key: 'isExportOriented', label: 'Export-Oriented?', type: 'boolean', group: 'Flags' },
  { key: 'isExServiceman', label: 'Ex-Serviceman?', type: 'boolean', group: 'Flags' },
  { key: 'isFirstGenEntrepreneur', label: 'First-Generation Entrepreneur?', type: 'boolean', group: 'Flags' },

  // Demographics
  { key: 'gender', label: 'Gender', type: 'select', group: 'Demographics', options: [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Transgender', label: 'Transgender' },
  ]},
  { key: 'age', label: 'Age', type: 'number', group: 'Demographics' },
  { key: 'caste', label: 'Social Category', type: 'select', group: 'Demographics', options: [
    { value: 'General', label: 'General' },
    { value: 'OBC', label: 'OBC' },
    { value: 'SC', label: 'SC (Scheduled Caste)' },
    { value: 'ST', label: 'ST (Scheduled Tribe)' },
    { value: 'Minority', label: 'Minority' },
  ]},
  { key: 'state', label: 'State', type: 'select', group: 'Demographics', options: [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
    'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
    'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
    'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
    'Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh',
    'Andaman and Nicobar Islands','Chandigarh','Puducherry',
  ].map(s => ({ value: s, label: s }))},
  { key: 'residence', label: 'Residence Type', type: 'select', group: 'Demographics', options: [
    { value: 'Urban', label: 'Urban' },
    { value: 'Rural', label: 'Rural' },
  ]},
  { key: 'disability', label: 'Differently Abled?', type: 'boolean', group: 'Demographics' },
  { key: 'minority', label: 'Minority Community?', type: 'boolean', group: 'Demographics' },
  { key: 'isBpl', label: 'BPL Card Holder?', type: 'boolean', group: 'Demographics' },
];

const GROUPS = ['Business', 'Registrations', 'Flags', 'Demographics'];

// ── Verdict styling ────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  ELIGIBLE:    { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Eligible' },
  ACTIONABLE:  { icon: Zap,          color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',       badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',       label: 'Actionable' },
  NEEDS_INFO:  { icon: HelpCircle,   color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',   label: 'Needs Info' },
  INELIGIBLE:  { icon: XCircle,      color: 'text-red-500 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',           badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',           label: 'Ineligible' },
} as const;

type Verdict = keyof typeof VERDICT_CONFIG;

interface SchemeDecision {
  scheme: {
    slug: string; schemeName: string; nodalMinistryName?: string;
    level?: string; briefDescription?: string; displayCategory?: string;
    benefitTypes?: string[]; tags?: string[];
  };
  decision: {
    verdict: Verdict; reasons?: string[]; verified_criteria?: string[];
    important_notes?: string; clarification?: { question: string; why_needed: string } | null;
    actionable_steps?: string[]; confidence?: number;
  };
}

interface SessionState {
  status: string;
  eligible: SchemeDecision[];
  ineligible: SchemeDecision[];
  needs_info: SchemeDecision[];
  actionable: SchemeDecision[];
  stats?: { totalPreFiltered?: number; totalEligible?: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, action }: { title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function SchemeCard({ item, defaultOpen = false }: { item: SchemeDecision; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const vcfg = VERDICT_CONFIG[item.decision.verdict] ?? VERDICT_CONFIG.INELIGIBLE;
  const Icon = vcfg.icon;

  return (
    <div className={`border rounded-none ${vcfg.bg}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${vcfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground leading-snug">
              {item.scheme.schemeName}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vcfg.badge}`}>
              {vcfg.label}
            </span>
            {item.decision.confidence != null && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {item.decision.confidence}% conf.
              </span>
            )}
            {item.scheme.level && (
              <span className="text-[10px] text-muted-foreground">{item.scheme.level}</span>
            )}
          </div>
          {item.scheme.nodalMinistryName && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.scheme.nodalMinistryName}</p>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          {item.scheme.briefDescription && (
            <p className="text-xs text-muted-foreground leading-relaxed">{item.scheme.briefDescription}</p>
          )}
          {(item.decision.reasons?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Reasons</p>
              <ul className="space-y-1">
                {item.decision.reasons!.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(item.decision.verified_criteria?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Verified Criteria</p>
              <ul className="space-y-1">
                {item.decision.verified_criteria!.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(item.decision.actionable_steps?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Steps to Become Eligible</p>
              <ul className="space-y-1">
                {item.decision.actionable_steps!.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400">
                    <Zap className="h-3 w-3 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.decision.clarification && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1">Clarification Needed</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">{item.decision.clarification.question}</p>
              {item.decision.clarification.why_needed && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 opacity-80">{item.decision.clarification.why_needed}</p>
              )}
            </div>
          )}
          {item.decision.important_notes && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded p-2">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              {item.decision.important_notes}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.scheme.displayCategory && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{item.scheme.displayCategory}</span>
            )}
            {item.scheme.benefitTypes?.map(b => (
              <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{b}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
const DEFAULT_PROFILE: Record<string, any> = {
  businessSector: 'manufacturing', msmeType: 'small', businessType: 'pvt_ltd',
  businessStage: 'growth', annualTurnoverLakhs: 70, totalEmployees: 60,
  gender: 'Male', caste: 'General', age: 35, state: 'Maharashtra',
  udyamRegistered: true, gstRegistered: true, isStartup: false,
  isWomenLed: false, isExportOriented: false, isExServiceman: false,
  disability: false, minority: false, isBpl: false,
  benefitFocus: 'any',
};

const TAB_ORDER: Verdict[] = ['ELIGIBLE', 'ACTIONABLE', 'NEEDS_INFO', 'INELIGIBLE'];

export default function AiEngineTesterPage() {
  const [profile, setProfile] = useState<Record<string, any>>({ ...DEFAULT_PROFILE });
  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [preFiltered, setPreFiltered] = useState<number | null>(null);
  const [tab, setTab] = useState<Verdict>('ELIGIBLE');
  const [error, setError] = useState<string | null>(null);
  const [profileJson, setProfileJson] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const pollSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${ENGINE_URL}/api/msme/ai-session/${id}`);
      const data = await res.json();
      if (!data.success) return;
      setSession(data);
      if (data.status === 'completed' || data.status === 'error') {
        stopPolling();
        setRunning(false);
      }
    } catch { /* ignore transient poll errors */ }
  }, []);

  const runAnalysis = async () => {
    stopPolling();
    setError(null);
    setSession(null);
    setSessionId(null);
    setPreFiltered(null);
    setRunning(true);
    setTab('ELIGIBLE');

    // Build LLM-ready profile
    const llmProfile: Record<string, any> = {
      employmentStatus: 'Self-Employed/ Entrepreneur',
      schemeCategory: [
        'Business & Entrepreneurship',
        'Agriculture,Rural & Environment',
        'Banking,Financial Services and Insurance',
        'Social welfare & Empowerment',
      ],
    };
    for (const [k, v] of Object.entries(profile)) {
      if (v !== '' && v !== null && v !== undefined) llmProfile[k] = v;
    }

    try {
      const res = await fetch(`${ENGINE_URL}/api/msme/ai-analyze-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: llmProfile, testCaseId: `admin-test-${Date.now()}` }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Engine returned an error');

      setSessionId(data.sessionId);
      setPreFiltered(data.totalPreFiltered);

      // Poll every 2.5 s
      pollRef.current = setInterval(() => pollSession(data.sessionId), 2500);
      pollSession(data.sessionId);
    } catch (e: any) {
      setError(e.message);
      setRunning(false);
    }
  };

  const clearCache = async () => {
    setClearingCache(true);
    try {
      await fetch(`${ENGINE_URL}/api/msme/ai-cache`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'all' }) });
    } finally { setClearingCache(false); }
  };

  const setPreset = (p: typeof PRESETS[number]) => setProfile({ ...DEFAULT_PROFILE, ...p.profile });
  const resetProfile = () => { setProfile({ ...DEFAULT_PROFILE }); setSession(null); setSessionId(null); setError(null); setPreFiltered(null); stopPolling(); setRunning(false); };

  const updateField = (key: string, value: any) => setProfile(p => ({ ...p, [key]: value }));

  const byVerdict = {
    ELIGIBLE:   session?.eligible ?? [],
    ACTIONABLE: session?.actionable ?? [],
    NEEDS_INFO: session?.needs_info ?? [],
    INELIGIBLE: session?.ineligible ?? [],
  };

  const grouped = GROUPS.reduce((acc, g) => {
    acc[g] = FIELDS.filter(f => f.group === g);
    return acc;
  }, {} as Record<string, FieldDef[]>);

  const inputCls = 'block w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50';

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-5">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">AI Eligibility Engine</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Engine Test Lab
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build any synthetic MSME profile and run the full AI eligibility pipeline — no real user required.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearCache} disabled={clearingCache} className="gap-1.5 text-xs">
              {clearingCache ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Clear AI Cache
            </Button>
            <Button variant="outline" size="sm" onClick={resetProfile} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button size="sm" onClick={runAnalysis} disabled={running} className="gap-1.5">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? 'Running…' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        {/* Preset quick-fills */}
        <div className="mt-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-2">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setPreset(p)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary transition-colors text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ─── Profile Builder ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {GROUPS.map(group => (
            <Section key={group} title={group} icon={group === 'Business' ? Zap : group === 'Registrations' ? CheckCircle2 : group === 'Flags' ? FlaskConical : Info}>
              <div className="grid grid-cols-1 gap-3">
                {grouped[group].map(field => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em] mb-1">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={String(profile[field.key] ?? '')}
                        onChange={e => updateField(field.key, e.target.value)}
                        className={inputCls}
                      >
                        <option value="">— not set —</option>
                        {field.options?.map(o => (
                          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <select
                        value={profile[field.key] === true ? 'true' : profile[field.key] === false ? 'false' : ''}
                        onChange={e => updateField(field.key, e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                        className={inputCls}
                      >
                        <option value="">— not set —</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={profile[field.key] ?? ''}
                        onChange={e => updateField(field.key, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                        className={inputCls}
                        min={field.type === 'number' ? 0 : undefined}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Section>
          ))}

          {/* JSON preview */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <button
              onClick={() => setProfileJson(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3 text-[13px] font-bold text-foreground bg-background border-b border-border"
            >
              <span className="flex items-center gap-2"><Copy className="h-4 w-4 text-muted-foreground" /> Profile JSON</span>
              {profileJson ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {profileJson && (
              <pre className="px-5 py-4 text-[11px] font-mono text-muted-foreground overflow-auto max-h-80 bg-muted/20">
                {JSON.stringify(profile, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* ─── Results Panel ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Status / Progress */}
          <div className="bg-card border border-border rounded-none p-5">
            {error ? (
              <div className="flex items-start gap-3 text-destructive">
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Engine Error</p>
                  <p className="text-xs mt-0.5 opacity-80">{error}</p>
                </div>
              </div>
            ) : !sessionId && !running ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <FlaskConical className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-semibold">No analysis run yet</p>
                <p className="text-xs mt-1">Configure the profile and click <strong>Run Analysis</strong></p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {running ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className="text-sm font-bold text-foreground">
                      {running ? 'Analysis in progress…' : 'Analysis complete'}
                    </span>
                  </div>
                  {sessionId && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {sessionId}
                    </span>
                  )}
                </div>

                {preFiltered != null && (
                  <div className="text-xs text-muted-foreground">
                    Pre-filtered: <strong className="text-foreground">{preFiltered} schemes</strong> passed MongoDB query
                  </div>
                )}

                {session && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {TAB_ORDER.map(v => {
                      const vcfg = VERDICT_CONFIG[v];
                      const count = byVerdict[v].length;
                      return (
                        <div key={v} className={`rounded p-2.5 text-center border ${vcfg.bg}`}>
                          <p className={`text-lg font-extrabold ${vcfg.color}`}>{count}</p>
                          <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{vcfg.label}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {running && !session && (
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results tabs */}
          {session && (
            <div className="bg-card border border-border rounded-none overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-border bg-background">
                {TAB_ORDER.map(v => {
                  const vcfg = VERDICT_CONFIG[v];
                  const count = byVerdict[v].length;
                  const active = tab === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setTab(v)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-bold transition-colors border-b-2 ${
                        active
                          ? `${vcfg.color} border-current`
                          : 'text-muted-foreground border-transparent hover:text-foreground'
                      }`}
                    >
                      <span>{vcfg.label}</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${vcfg.badge}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Scheme list */}
              <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {byVerdict[tab].length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <p className="text-sm font-semibold">No {VERDICT_CONFIG[tab].label.toLowerCase()} schemes</p>
                    {running && <p className="text-xs mt-1">Still analysing…</p>}
                  </div>
                ) : (
                  byVerdict[tab].map((item, i) => (
                    <SchemeCard key={item.scheme.slug ?? i} item={item} defaultOpen={tab === 'ELIGIBLE' && i < 3} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

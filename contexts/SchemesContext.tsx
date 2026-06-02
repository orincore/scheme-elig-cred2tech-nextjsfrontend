'use client';

import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';

// NestJS backend: auth, profile, bookmarks, eligibility proxy + snapshot store.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
// AI Eligibility Check Engine: scheme detail (REST) + live decisions/questions (WS).
const ELIGIBILITY_URL = process.env.NEXT_PUBLIC_ELIGIBILITY_URL || 'http://localhost:4000';
const ELIGIBILITY_WS_URL =
  process.env.NEXT_PUBLIC_ELIGIBILITY_WS_URL ||
  ELIGIBILITY_URL.replace(/^http/, 'ws');

const SESSION_KEY = 'msme_elig_session';
const ANSWERED_KEY = 'msme_elig_answered';

export interface Scheme {
  id: string;
  slug: string;
  schemeName: string;
  nodalMinistryName: string;
  briefDescription: string;
  schemeLevel: string;
  tags: string[];
  schemeCloseDate: string | null;
  schemeCategory: string[];
  schemeFor: string;
  beneficiaryState: string[];
  matchReason?: string;
}

export type MissingField = {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  options?: { value: string; label: string }[];
};

export interface EligibilityQuestion {
  field_id: string;
  question: string;
  why_needed?: string;
  expected_format?: string;
  options?: string[];
  affectedSchemes: { slug: string; schemeName: string }[];
}

export type Verdict = 'ELIGIBLE' | 'NEEDS_INFO' | 'INELIGIBLE' | 'ACTIONABLE';

export interface SchemeDecision {
  verdict: Verdict;
  confidence?: string;
  scheme_relevance?: string;
  reasons?: string[];
  verified_criteria?: string[];
  important_notes?: string;
  clarification?: {
    field_id?: string;
    question?: string;
    why_needed?: string;
    expected_format?: string;
    options?: string[];
  } | null;
  // For ACTIONABLE: steps the user can take to become eligible.
  actionable_steps?: string[];
  difficulty?: 'easy' | 'moderate' | string;
  cached?: boolean;
  reverified?: boolean;
}

// One scheme's full analysis result — the complete card data.
export interface SchemeDecisionItem {
  scheme: any;          // engine scheme doc (slug, name, ministry, benefits, eligibility, …)
  decision: SchemeDecision;
}

export type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';

export interface SchemesContextType {
  schemes: Scheme[];
  savedSchemes: Scheme[];
  searchQuery: string;
  selectedFilters: {
    category: string[];
    ministry: string[];
    state: string[];
    level: string[];
    type: string[];
    minInvestment: number;
    maxInvestment: number;
  };
  filterOptions: {
    categories: string[];
    ministries: string[];
    states: string[];
    levels: string[];
    types: string[];
  };
  isLoading: boolean;
  currentPage: number;
  itemsPerPage: number;
  missingFields: MissingField[];
  showMissingFieldsModal: boolean;

  // ── AI engine eligibility (live, full detail) ─────────────────────────────
  analysisStatus: AnalysisStatus;
  analysisError: string | null;
  analysisProgress: { checked: number; total: number; eligible: number };
  eligibleItems: SchemeDecisionItem[];
  needsInfoItems: SchemeDecisionItem[];
  ineligibleItems: SchemeDecisionItem[];
  actionableItems: SchemeDecisionItem[];
  questions: EligibilityQuestion[];
  isSubmittingAnswers: boolean;
  sessionId: string | null;
  lastUpdated: string | null;

  setSearchQuery: (query: string) => void;
  setSelectedFilters: (filters: Partial<SchemesContextType['selectedFilters']>) => void;
  loadSchemesForDashboard: () => Promise<void>;
  searchSchemes: (profile?: any) => Promise<void>;
  submitMissingFields: (values: Record<string, any>) => Promise<void>;
  dismissMissingFieldsModal: () => void;
  saveScheme: (schemes: Scheme[]) => Promise<boolean>;
  removeSavedScheme: (schemeId: string) => void;
  getSavedSchemes: () => Promise<void>;
  getSchemeById: (id: string) => Scheme | undefined;
  setCurrentPage: (page: number) => void;
  getTotalPages: () => number;
  getFilteredSchemes: () => Scheme[];
  getSchemeDetailBySlug: (slug: string) => Promise<any>;
  getSchemeDocuments: (slugOrId: string) => Promise<any[]>;
  getSchemeFaqs: (slugOrId: string) => Promise<any[]>;
  getSchemeApplicationProcess: (slugOrId: string) => Promise<any>;
  fetchSchemeBySlug: (slug: string) => Promise<Scheme | null>;
  refreshSchemes: () => Promise<void>;
  submitQuestionAnswers: (answers: Record<string, string>) => Promise<void>;
}

const REQUIRED_SEARCH_FIELDS: MissingField[] = [
  {
    key: 'sector',
    label: 'Business Sector / Industry',
    type: 'select',
    options: [
      { value: 'finance',       label: 'Finance, Banking, Fintech & Professional Services' },
      { value: 'technology',    label: 'IT / Software / Technology / ITES' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'retail',        label: 'Retail / Trading / Wholesale' },
      { value: 'services',      label: 'Other Services (Consulting, Admin, etc.)' },
      { value: 'healthcare',    label: 'Healthcare & Pharma' },
      { value: 'education',     label: 'Education & Training' },
      { value: 'construction',  label: 'Construction & Real Estate' },
      { value: 'transport',     label: 'Transportation & Logistics' },
      { value: 'agro',          label: 'Agriculture, Food Processing & Dairy' },
      { value: 'textile',       label: 'Textile & Apparel' },
      { value: 'handicraft',    label: 'Handicraft & Artisan' },
      { value: 'fisheries',     label: 'Fisheries & Aquaculture' },
      { value: 'ecommerce',     label: 'E-Commerce' },
      { value: 'energy',        label: 'Energy & Renewables' },
      { value: 'hospitality',   label: 'Hospitality & Tourism' },
      { value: 'media',         label: 'Media & Entertainment' },
    ],
  },
  {
    key: 'msme_size',
    label: 'MSME Size',
    type: 'select',
    options: [
      { value: 'micro',  label: 'Micro' },
      { value: 'small',  label: 'Small' },
      { value: 'medium', label: 'Medium' },
    ],
  },
  {
    key: 'annual_turnover',
    label: 'Annual Turnover Range',
    type: 'select',
    options: [
      { value: 'under5L',    label: 'Under ₹5 Lakh' },
      { value: '5L_40L',     label: '₹5L – ₹40L' },
      { value: '40L_1Cr',    label: '₹40L – ₹1 Cr' },
      { value: '1Cr_10Cr',   label: '₹1 Cr – ₹10 Cr' },
      { value: '10Cr_250Cr', label: '₹10 Cr – ₹250 Cr' },
      { value: 'above250Cr', label: 'Above ₹250 Cr' },
    ],
  },
  {
    key: 'total_employees',
    label: 'Total Employees',
    type: 'select',
    options: [
      { value: '1_5',     label: '1–5' },
      { value: '6_25',    label: '6–25' },
      { value: '26_100',  label: '26–100' },
      { value: '101_500', label: '101–500' },
      { value: '501_plus', label: '501+' },
    ],
  },
  {
    key: 'business_type',
    label: 'Business Type',
    type: 'select',
    options: [
      { value: 'startup',       label: 'Startup' },
      { value: 'proprietorship', label: 'Proprietorship / Sole Trader' },
      { value: 'partnership',   label: 'Partnership' },
      { value: 'pvt_ltd',       label: 'Private Limited (Pvt Ltd / LLP)' },
      { value: 'cooperative',   label: 'Cooperative' },
      { value: 'women_owned',   label: 'Women-Owned Business' },
      { value: 'sc_st_owned',   label: 'SC/ST-Owned Business' },
      { value: 'ngo',           label: 'NGO / Social Enterprise' },
    ],
  },
  {
    key: 'business_stage',
    label: 'Business Stage',
    type: 'select',
    options: [
      { value: 'idea',   label: 'Idea Stage' },
      { value: 'early',  label: 'Early Stage (< 2 years)' },
      { value: 'growth', label: 'Growth Stage (2–5 years)' },
      { value: 'mature', label: 'Mature / Established (5+ years)' },
    ],
  },
  {
    key: 'benefit_focus',
    label: 'Primary Benefit Focus',
    type: 'select',
    options: [
      { value: 'any',            label: 'Any / All Benefits' },
      { value: 'loan',           label: 'Loan / Credit / Finance' },
      { value: 'subsidy',        label: 'Subsidy / Grant / Financial Assistance' },
      { value: 'training',       label: 'Training / Skill Development' },
      { value: 'technology',     label: 'Technology Upgradation / Digital' },
      { value: 'marketing',      label: 'Marketing / Export Promotion' },
      { value: 'insurance',      label: 'Insurance / Protection' },
      { value: 'infrastructure', label: 'Infrastructure / Industrial Park' },
      { value: 'tax',            label: 'Tax Exemption / Concession' },
    ],
  },
  {
    key: 'state',
    label: 'State',
    type: 'text',
  },
  {
    key: 'gender',
    label: 'Proprietor / Director Gender',
    type: 'select',
    options: [
      { value: 'Male',        label: 'Male' },
      { value: 'Female',      label: 'Female' },
      { value: 'Transgender', label: 'Transgender' },
    ],
  },
  {
    key: 'caste',
    label: 'Social Category',
    type: 'select',
    options: [
      { value: 'General',  label: 'General (No reservation category)' },
      { value: 'OBC',      label: 'OBC (Other Backward Class)' },
      { value: 'SC',       label: 'SC (Scheduled Caste)' },
      { value: 'ST',       label: 'ST (Scheduled Tribe)' },
      { value: 'Minority', label: 'Minority' },
    ],
  },
  {
    key: 'age',
    label: 'Age of Proprietor / Director',
    type: 'number',
  },
  {
    key: 'differently_abled',
    label: 'Are you differently abled?',
    type: 'select',
    options: [
      { value: 'false', label: 'No' },
      { value: 'true',  label: 'Yes' },
    ],
  },
  {
    key: 'bpl',
    label: 'Do you hold a BPL (Below Poverty Line) card?',
    type: 'select',
    options: [
      { value: 'false', label: 'No' },
      { value: 'true',  label: 'Yes' },
    ],
  },
  {
    key: 'minority',
    label: 'Do you belong to a minority community?',
    type: 'select',
    options: [
      { value: 'false', label: 'No' },
      { value: 'true',  label: 'Yes' },
    ],
  },
];

const SECTOR_NORMALISE_MAP: Record<string, string> = {
  manufacturing: 'manufacturing', agro: 'agro', textile: 'textile', handicraft: 'handicraft',
  fisheries: 'fisheries', technology: 'technology', construction: 'construction', retail: 'retail',
  services: 'services', finance: 'finance', education: 'education', healthcare: 'healthcare',
  transport: 'transport', ecommerce: 'ecommerce', energy: 'energy', hospitality: 'hospitality',
  media: 'media',
  it_software: 'technology', ites_bpo: 'technology', telecom: 'technology', fintech: 'finance',
  banking: 'finance', nbfc: 'finance', professional_services: 'finance', wholesale: 'retail',
  transportation: 'transport', food_processing: 'agro', agriculture: 'agro',
  media_entertainment: 'media', arts_entertainment: 'media', real_estate: 'construction',
  other: 'other',
};

const PROFILE_SOURCE_MAP: Record<string, (p: Record<string, any>) => any> = {
  sector:            (p) => p.sector || p.businessSector || p.business_sector,
  msme_size:         (p) => p.enterpriseCategory || p.enterprise_category || p.msme_size,
  annual_turnover:   (p) => p.annualTurnoverLakhs || p.annual_turnover_lakhs || p.annual_turnover,
  total_employees:   (p) => p.total_employees || p.totalEmployees,
  business_type:     (p) => p.businessType || p.business_type || p.entityType || p.entity_type,
  business_stage:    (p) => p.businessStage || p.business_stage,
  benefit_focus:     (p) => p.benefitFocus || p.benefit_focus,
  state:             (p) => p.state || p.principalState,
  gender:            (p) => p.gender,
  caste:             (p) => p.caste || (Array.isArray(p.socialCategory) ? p.socialCategory[0] : p.socialCategory),
  age:               (p) => p.age,
  differently_abled: (p) => (p.differently_abled !== undefined && p.differently_abled !== null) ? String(p.differently_abled) : undefined,
  bpl:               (p) => (p.bpl !== undefined && p.bpl !== null) ? String(p.bpl) : undefined,
  minority:          (p) => (p.minority !== undefined && p.minority !== null) ? String(p.minority) : undefined,
};

const DB_SAVE_KEY_MAP: Record<string, string> = {
  sector: 'businessSector', msme_size: 'enterpriseCategory', annual_turnover: 'annualTurnoverLakhs',
  total_employees: 'total_employees', business_type: 'businessType', business_stage: 'businessStage',
  benefit_focus: 'benefitFocus', state: 'state', gender: 'gender', caste: 'caste', age: 'age',
  differently_abled: 'differently_abled', bpl: 'bpl', minority: 'minority',
};

function getMissingFields(rawProfile: Record<string, any>): MissingField[] {
  return REQUIRED_SEARCH_FIELDS.filter((f) => {
    const getter = PROFILE_SOURCE_MAP[f.key];
    if (!getter) return false;
    const val = getter(rawProfile);
    if (val === undefined || val === null || val === '') return true;
    if (f.key === 'annual_turnover' && !isNaN(parseFloat(val)) && parseFloat(val) === 0) return true;
    if (f.key === 'total_employees' && !isNaN(parseInt(val)) && parseInt(val) === 0) return true;
    if (f.key === 'benefit_focus' && val === 'any') return false;
    if (f.key === 'sector') {
      const mapped = SECTOR_NORMALISE_MAP[val];
      const VALID = ['manufacturing','agro','textile','handicraft','fisheries','technology','construction',
        'retail','services','finance','education','healthcare','transport','ecommerce','energy','hospitality','media'];
      return !mapped || !VALID.includes(mapped);
    }
    if (f.key === 'business_type' && val === 'other') return true;
    if (['differently_abled', 'bpl', 'minority'].includes(f.key)) return false;
    return false;
  });
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────
function transformSchemeItem(item: any): Scheme {
  const fields = item.fields || {};
  const slug = (
    fields.slug || fields.schemeId || fields.id || item.id || item._id || item.schemeId ||
    fields.schemeName?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 80)
  ) || '';
  return {
    id: slug || item.id || item._id || '',
    slug,
    schemeName: fields.schemeName || fields.name || '',
    nodalMinistryName: fields.nodalMinistryName || fields.ministry || '',
    briefDescription: fields.briefDescription || fields.description || '',
    schemeLevel: fields.level || fields.schemeLevel || '',
    tags: fields.tags || [],
    schemeCloseDate: fields.schemeCloseDate || null,
    schemeCategory: fields.schemeCategory || [],
    schemeFor: fields.schemeFor || '',
    beneficiaryState: fields.beneficiaryState || [],
    matchReason: fields.matchReason || '',
  };
}

function mapEngineScheme(scheme: any, decision?: any): Scheme {
  const slug = scheme.slug || scheme._id || '';
  return {
    id: slug,
    slug,
    schemeName: scheme.schemeName || scheme.schemeShortTitle || '',
    nodalMinistryName: scheme.nodalMinistryName || '',
    briefDescription: scheme.briefDescription || '',
    schemeLevel: scheme.level || scheme.schemeLevel || '',
    tags: scheme.tags || [],
    schemeCloseDate: scheme.schemeCloseDate || null,
    schemeCategory: scheme.schemeCategory || [],
    schemeFor: scheme.schemeFor || '',
    beneficiaryState: scheme.eligibility?.beneficiaryState || scheme.beneficiaryState || [],
    matchReason: decision?.reasons?.[0] || '',
  };
}

function toCacheItem(s: Scheme): any {
  return {
    id: s.slug,
    fields: {
      slug: s.slug, schemeName: s.schemeName, nodalMinistryName: s.nodalMinistryName,
      briefDescription: s.briefDescription, level: s.schemeLevel, tags: s.tags || [],
      schemeCategory: s.schemeCategory || [], schemeFor: s.schemeFor || '',
      beneficiaryState: s.beneficiaryState || [], schemeCloseDate: s.schemeCloseDate || null,
      matchReason: s.matchReason || '',
    },
  };
}

// Cap the ineligible list we persist so the snapshot payload stays reasonable.
const MAX_PERSIST_INELIGIBLE = 60;

const SchemesContext = createContext<SchemesContextType | undefined>(undefined);

export const SchemesProvider = ({ children }: { children: ReactNode }) => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [savedSchemes, setSavedSchemes] = useState<Scheme[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFiltersState] = useState({
    category: [] as string[], ministry: [] as string[], state: [] as string[],
    level: [] as string[], type: [] as string[], minInvestment: 0, maxInvestment: 10000000,
  });
  const [filterOptions, setFilterOptions] = useState({
    categories: [] as string[], ministries: [] as string[], states: [] as string[],
    levels: [] as string[], types: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [token, setToken] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [showMissingFieldsModal, setShowMissingFieldsModal] = useState(false);
  const [pendingRawProfile, setPendingRawProfile] = useState<Record<string, any> | null>(null);

  // ── AI engine eligibility state ──────────────────────────────────────────
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState({ checked: 0, total: 0, eligible: 0 });
  const [eligibleItems, setEligibleItems] = useState<SchemeDecisionItem[]>([]);
  const [needsInfoItems, setNeedsInfoItems] = useState<SchemeDecisionItem[]>([]);
  const [ineligibleItems, setIneligibleItems] = useState<SchemeDecisionItem[]>([]);
  const [actionableItems, setActionableItems] = useState<SchemeDecisionItem[]>([]);
  const [questions, setQuestions] = useState<EligibilityQuestion[]>([]);
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Live buckets keyed by slug.
  const eligibleMapRef = useRef<Map<string, SchemeDecisionItem>>(new Map());
  const needsInfoMapRef = useRef<Map<string, SchemeDecisionItem>>(new Map());
  const ineligibleMapRef = useRef<Map<string, SchemeDecisionItem>>(new Map());
  const actionableMapRef = useRef<Map<string, SchemeDecisionItem>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const schemeDetailCacheRef = useRef<Map<string, any>>(new Map());
  const snapshotTimerRef = useRef<any>(null);
  const progressRef = useRef({ checked: 0, total: 0, eligible: 0 });
  // Current live questions (ref mirror of state, so snapshot saves the latest)
  // and the set of field_ids the user has already answered (so an answered
  // question never reappears, even after a refresh or a stale snapshot).
  const questionsRef = useRef<EligibilityQuestion[]>([]);
  const answeredFieldIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setToken(sessionStorage.getItem('msme_auth_token'));
    try {
      const saved = sessionStorage.getItem(ANSWERED_KEY);
      if (saved) answeredFieldIdsRef.current = new Set(JSON.parse(saved));
    } catch {}
    return () => {
      try { wsRef.current?.close(); } catch {}
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, []);

  const persistAnswered = () => {
    try { sessionStorage.setItem(ANSWERED_KEY, JSON.stringify([...answeredFieldIdsRef.current])); } catch {}
  };

  // A needs-info item is "actionable" only if it carries a clarification whose
  // field_id has not been answered yet.
  const isActionableNeedsInfo = (it: SchemeDecisionItem): boolean => {
    const c: any = it.decision?.clarification;
    return !!(c && c.field_id && !answeredFieldIdsRef.current.has(c.field_id));
  };

  // Derive the consolidated question list straight from the needs-info bucket
  // (deduped by field_id), so the popup is ALWAYS in sync with the cards.
  const recomputeQuestions = () => {
    const byField = new Map<string, EligibilityQuestion>();
    for (const it of needsInfoMapRef.current.values()) {
      if (!isActionableNeedsInfo(it)) continue;
      const c: any = it.decision!.clarification;
      if (!byField.has(c.field_id)) {
        byField.set(c.field_id, {
          field_id: c.field_id, question: c.question || '', why_needed: c.why_needed,
          expected_format: c.expected_format, options: c.options || [], affectedSchemes: [],
        });
      }
      byField.get(c.field_id)!.affectedSchemes.push({ slug: it.scheme.slug, schemeName: it.scheme.schemeName });
    }
    const qs = Array.from(byField.values()).sort((a, b) => b.affectedSchemes.length - a.affectedSchemes.length);
    questionsRef.current = qs;
    setQuestions(qs);
  };

  // Derive filter options from the eligible scheme list.
  useEffect(() => {
    if (schemes.length === 0) return;
    const categories = new Set<string>(); const ministries = new Set<string>();
    const states = new Set<string>(); const levels = new Set<string>(); const types = new Set<string>();
    schemes.forEach((scheme) => {
      scheme.schemeCategory?.forEach((cat) => categories.add(cat));
      if (scheme.nodalMinistryName) ministries.add(scheme.nodalMinistryName);
      scheme.beneficiaryState?.forEach((state) => states.add(state));
      if (scheme.schemeLevel) levels.add(scheme.schemeLevel);
      scheme.tags?.forEach((tag) => types.add(tag));
    });
    setFilterOptions({
      categories: Array.from(categories).sort(), ministries: Array.from(ministries).sort(),
      states: Array.from(states).sort(), levels: Array.from(levels).sort(), types: Array.from(types).sort(),
    });
  }, [schemes]);

  const setSelectedFilters = (filters: Partial<typeof selectedFilters>) => {
    setSelectedFiltersState((prev) => ({ ...prev, ...filters }));
    setCurrentPage(1);
  };

  // Push the in-memory buckets into React state (sorted: high-confidence first for eligible).
  const syncBuckets = () => {
    let elig = Array.from(eligibleMapRef.current.values()).sort(
      (a, b) => (b.decision.confidence === 'high' ? 1 : 0) - (a.decision.confidence === 'high' ? 1 : 0),
    );
    // Only show needs-info schemes that still have an unanswered question, so
    // the "Needs info N" count always matches what the popup can ask.
    let ni = Array.from(needsInfoMapRef.current.values()).filter(isActionableNeedsInfo);
    let inel = Array.from(ineligibleMapRef.current.values());
    let actionable = Array.from(actionableMapRef.current.values());

    // ── Cross-bucket de-duplication by scheme NAME ──────────────────────────
    // Different scheme records can share a display name (e.g. a Central scheme
    // and a State implementation, or a duplicate ingest). When that happens the
    // same name can land in different tabs and look like a bug. Keep each name
    // in only its STRONGEST bucket: eligible > actionable > needs-info > ineligible.
    const seenNames = new Set<string>();
    const nameKey = (it: SchemeDecisionItem) =>
      (it.scheme.schemeName || it.scheme.slug || '').trim().toLowerCase();
    const dedupeByName = (items: SchemeDecisionItem[]) => {
      const out: SchemeDecisionItem[] = [];
      for (const it of items) {
        const key = nameKey(it);
        if (!key) { out.push(it); continue; }
        if (seenNames.has(key)) continue;   // already shown in a stronger bucket
        seenNames.add(key);
        out.push(it);
      }
      return out;
    };
    elig = dedupeByName(elig);             // highest priority — claims the name first
    actionable = dedupeByName(actionable);
    ni = dedupeByName(ni);
    inel = dedupeByName(inel);

    setEligibleItems(elig);
    setNeedsInfoItems(ni);
    setIneligibleItems(inel);
    setActionableItems(actionable);
    setSchemes(elig.map((i) => mapEngineScheme(i.scheme, i.decision)));
    progressRef.current = { ...progressRef.current, eligible: elig.length };
    setAnalysisProgress({ ...progressRef.current });
    recomputeQuestions();
  };

  // Route one decision into the correct bucket (removing it from the others).
  const routeDecision = (scheme: any, decision: SchemeDecision) => {
    const slug = scheme?.slug;
    if (!slug) return;
    eligibleMapRef.current.delete(slug);
    needsInfoMapRef.current.delete(slug);
    ineligibleMapRef.current.delete(slug);
    actionableMapRef.current.delete(slug);
    const item: SchemeDecisionItem = { scheme, decision };
    if (decision.verdict === 'ELIGIBLE') eligibleMapRef.current.set(slug, item);
    else if (decision.verdict === 'NEEDS_INFO') needsInfoMapRef.current.set(slug, item);
    else if (decision.verdict === 'ACTIONABLE') actionableMapRef.current.set(slug, item);
    else ineligibleMapRef.current.set(slug, item);
  };

  const resetBuckets = () => {
    eligibleMapRef.current = new Map();
    needsInfoMapRef.current = new Map();
    ineligibleMapRef.current = new Map();
    actionableMapRef.current = new Map();
    setEligibleItems([]); setNeedsInfoItems([]); setIneligibleItems([]); setActionableItems([]); setSchemes([]);
  };

  // ── Snapshot persistence (durable full card data) ────────────────────────
  const buildSnapshotData = () => ({
    eligible: Array.from(eligibleMapRef.current.values()),
    needsInfo: Array.from(needsInfoMapRef.current.values()),
    ineligible: Array.from(ineligibleMapRef.current.values()).slice(0, MAX_PERSIST_INELIGIBLE),
    actionable: Array.from(actionableMapRef.current.values()),
    questions: questionsRef.current,
    answeredFieldIds: [...answeredFieldIdsRef.current],
    progress: progressRef.current,
  });

  const getActiveBusinessId = (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    return sessionStorage.getItem('msme_active_business') || undefined;
  };

  const saveSnapshotNow = async (authToken: string, sid: string | null, status: AnalysisStatus) => {
    try {
      await fetch(`${API_BASE_URL}/api/msme-eligibility/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ sessionId: sid, status, data: { ...buildSnapshotData(), status }, businessId: getActiveBusinessId() }),
      });
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.warn('[Schemes] Snapshot save failed (non-fatal):', err);
    }
  };

  const scheduleSnapshot = (authToken: string, sid: string | null, status: AnalysisStatus) => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => saveSnapshotNow(authToken, sid, status), 2500);
  };


  // ── Live WebSocket ───────────────────────────────────────────────────────
  const connectEligibilitySocket = (sid: string, authToken: string) => {
    try { wsRef.current?.close(); } catch {}
    let ws: WebSocket;
    try { ws = new WebSocket(`${ELIGIBILITY_WS_URL}/ws-ai`); }
    catch (err) { console.error('[Schemes] WS init failed:', err); return; }
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', sessionId: sid }));

    ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }
      switch (msg.type) {
        case 'scheme_decision': {
          if (!msg.scheme?.slug || !msg.decision) break;
          routeDecision(msg.scheme, msg.decision);
          syncBuckets();
          scheduleSnapshot(authToken, sid, 'analyzing');
          break;
        }
        case 'progress': {
          const checked = (msg.stage1_rejected || 0) + (msg.stage2_eligible || 0) +
            (msg.stage2_ineligible || 0) + (msg.cache_hits || 0);
          progressRef.current = {
            ...progressRef.current,
            checked: Number.isFinite(checked) ? checked : progressRef.current.checked,
            total: msg.total || progressRef.current.total,
          };
          setAnalysisProgress({ ...progressRef.current });
          break;
        }
        case 'complete': {
          setAnalysisStatus('complete');
          syncBuckets();
          saveSnapshotNow(authToken, sid, 'complete');
          break;
        }
        case 'questionnaire_complete': {
          syncBuckets();
          saveSnapshotNow(authToken, sid, 'complete');
          break;
        }
        case 'error': {
          setAnalysisStatus('error');
          setAnalysisError(msg.error || 'Analysis failed');
          break;
        }
        default: break;
      }
    };

    ws.onerror = () => console.warn('[Schemes] Eligibility socket error');
    ws.onclose = () => { if (wsRef.current === ws) wsRef.current = null; };
  };

  // ── Start / restart analysis ─────────────────────────────────────────────
  const startEligibilityAnalysis = async (authToken: string, opts?: { refresh?: boolean }) => {
    resetBuckets();
    answeredFieldIdsRef.current = new Set();
    questionsRef.current = [];
    try { sessionStorage.removeItem(ANSWERED_KEY); } catch {}
    setQuestions([]);
    setAnalysisError(null);
    setAnalysisStatus('analyzing');
    progressRef.current = { checked: 0, total: 0, eligible: 0 };
    setAnalysisProgress({ ...progressRef.current });
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/msme-eligibility/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ refresh: opts?.refresh === true, businessId: getActiveBusinessId() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.sessionId) {
        throw new Error(data?.error || `Analysis failed (status ${res.status})`);
      }
      setSessionId(data.sessionId);
      sessionStorage.setItem(SESSION_KEY, data.sessionId);
      progressRef.current = { ...progressRef.current, total: data.totalPreFiltered || 0 };
      setAnalysisProgress({ ...progressRef.current });
      connectEligibilitySocket(data.sessionId, authToken);
      pollSessionUntilComplete(data.sessionId, authToken);
    } catch (err: any) {
      console.error('[Schemes] startEligibilityAnalysis error:', err);
      setAnalysisStatus('error');
      setAnalysisError(err?.message || 'Failed to start analysis');
    } finally {
      setIsLoading(false);
    }
  };

  // REST fallback so we still finish even if the socket drops mid-run.
  const pollSessionUntilComplete = (sid: string, authToken: string) => {
    let attempts = 0;
    const maxAttempts = 80;
    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch(`${API_BASE_URL}/api/msme-eligibility/session/${sid}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (data?.success) {
          reconcileFromSession(data);
          if (data.status === 'completed') {
            setAnalysisStatus((prev) => (prev === 'error' ? prev : 'complete'));
            await saveSnapshotNow(authToken, sid, 'complete');
            return;
          }
          if (data.status === 'error') {
            setAnalysisStatus('error');
            setAnalysisError('Analysis failed on the engine');
            return;
          }
        }
      } catch { /* transient */ }
      if (attempts < maxAttempts) setTimeout(tick, 3000);
    };
    setTimeout(tick, 3000);
  };

  // Merge a session-state payload (eligible/needs_info/ineligible arrays) into the buckets.
  const reconcileFromSession = (session: any) => {
    let changed = false;
    const apply = (arr: any[]) => {
      for (const e of arr || []) {
        if (e?.scheme?.slug && e?.decision) { routeDecision(e.scheme, e.decision); changed = true; }
      }
    };
    apply(session.eligible);
    apply(session.needs_info);
    apply(session.ineligible);
    if (changed) syncBuckets();
  };

  // ── Submit answers to live questions ─────────────────────────────────────
  const submitQuestionAnswers = async (answers: Record<string, string>) => {
    const authToken = sessionStorage.getItem('msme_auth_token') || token;
    if (!authToken || !sessionId) return;
    setIsSubmittingAnswers(true);
    // Record answered fields immediately so they never reappear (even if the
    // engine re-asks or a stale snapshot is restored later).
    Object.keys(answers).forEach((id) => answeredFieldIdsRef.current.add(id));
    persistAnswered();
    syncBuckets(); // drop answered questions from the popup immediately
    try {
      const res = await fetch(`${API_BASE_URL}/api/msme-eligibility/questionnaire-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ sessionId, answers }),
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.updatedDecisions)) {
        for (const u of data.updatedDecisions) {
          if (!u.slug || !u.decision) continue;
          // Prefer an existing fuller scheme doc; fall back to the trimmed one.
          const existing =
            eligibleMapRef.current.get(u.slug)?.scheme ||
            needsInfoMapRef.current.get(u.slug)?.scheme ||
            ineligibleMapRef.current.get(u.slug)?.scheme ||
            actionableMapRef.current.get(u.slug)?.scheme ||
            u.scheme || { slug: u.slug, schemeName: u.schemeName };
          routeDecision(existing, { ...u.decision, reverified: true });
        }
        syncBuckets();
      }
      await saveSnapshotNow(authToken, sessionId, 'complete');
    } catch (err) {
      console.error('[Schemes] submitQuestionAnswers error:', err);
    } finally {
      setIsSubmittingAnswers(false);
    }
  };

  // ── Restore from a snapshot blob ─────────────────────────────────────────
  const restoreFromSnapshot = (snapshot: any) => {
    const d = snapshot?.data || {};
    // Restore answered fields BEFORE syncing so questions are derived correctly.
    if (Array.isArray(d.answeredFieldIds)) {
      answeredFieldIdsRef.current = new Set([...answeredFieldIdsRef.current, ...d.answeredFieldIds]);
      persistAnswered();
    }
    resetBuckets();
    (d.eligible || []).forEach((i: SchemeDecisionItem) => i?.scheme?.slug && routeDecision(i.scheme, i.decision));
    (d.needsInfo || []).forEach((i: SchemeDecisionItem) => i?.scheme?.slug && routeDecision(i.scheme, i.decision));
    (d.ineligible || []).forEach((i: SchemeDecisionItem) => i?.scheme?.slug && routeDecision(i.scheme, i.decision));
    (d.actionable || []).forEach((i: SchemeDecisionItem) => i?.scheme?.slug && routeDecision(i.scheme, i.decision));
    progressRef.current = d.progress || { checked: 0, total: 0, eligible: eligibleMapRef.current.size };
    syncBuckets(); // recomputes the question popup from the restored needs-info bucket
    setSessionId(snapshot.sessionId || null);
    setLastUpdated(snapshot.updatedAt || null);
    // A snapshot that was still "analyzing" but whose engine session is gone is
    // shown as the best-available completed result.
    setAnalysisStatus('complete');
  };

  // ── Dashboard load: restore live session → snapshot → fresh analysis ──────
  const loadSchemesForDashboard = async () => {
    const authToken = sessionStorage.getItem('msme_auth_token');
    if (!authToken) return;
    setIsLoading(true);
    try {
      const mobile = sessionStorage.getItem('msme_mobile');
      if (!mobile) { setIsLoading(false); return; }

      const profileRes = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobile}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const profileData = await profileRes.json();
      const profile = profileData?.user || {};

      const missing = getMissingFields(profile);
      if (missing.length > 0) {
        setPendingRawProfile(profile);
        setMissingFields(missing);
        setShowMissingFieldsModal(true);
        setIsLoading(false);
        return;
      }

      // 1) Durable DB snapshot FIRST — pull saved schemes straight from the
      //    database so a page refresh (or a restarted engine) never re-runs the
      //    AI analyzer when results already exist.
      let restored = false;
      try {
        const bizQ = getActiveBusinessId() ? `?businessId=${getActiveBusinessId()}` : '';
        const snapRes = await fetch(`${API_BASE_URL}/api/msme-eligibility/snapshot${bizQ}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const snapData = await snapRes.json();
        const d = snapData?.snapshot?.data;
        if (snapData?.success && d && ((d.eligible?.length || 0) + (d.needsInfo?.length || 0) + (d.ineligible?.length || 0)) > 0) {
          restoreFromSnapshot(snapData.snapshot);
          restored = true;
        }
      } catch { /* fall through */ }

      // 2) If the engine still has a LIVE session (analysis was mid-flight),
      //    reconnect on top of the restored data to keep it streaming. If the
      //    engine was restarted, this simply 404s and we keep the snapshot.
      const savedSid = sessionStorage.getItem(SESSION_KEY);
      if (savedSid) {
        try {
          const sres = await fetch(`${API_BASE_URL}/api/msme-eligibility/session/${savedSid}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          });
          const sdata = await sres.json();
          if (sdata?.success && (sdata.status === 'running' || sdata.status === 'completed')) {
            setSessionId(savedSid);
            if (!restored) resetBuckets();
            reconcileFromSession(sdata);
            if (sdata.status === 'running') {
              setAnalysisStatus('analyzing');
              connectEligibilitySocket(savedSid, authToken);
              pollSessionUntilComplete(savedSid, authToken);
            } else {
              setAnalysisStatus('complete');
              await saveSnapshotNow(authToken, savedSid, 'complete');
            }
            setIsLoading(false);
            return;
          }
        } catch { /* fall through */ }
      }

      // 3) We had saved data but no live session — show the DB copy, done.
      if (restored) { setIsLoading(false); return; }

      // 4) Nothing saved anywhere — run a fresh live analysis.
      await startEligibilityAnalysis(authToken);
    } catch (err) {
      console.error('Error loading dashboard schemes:', err);
      setIsLoading(false);
    }
  };

  const submitMissingFields = async (values: Record<string, any>) => {
    const authToken = sessionStorage.getItem('msme_auth_token');
    if (!authToken) return;

    const dbPayload: Record<string, any> = {};
    for (const [searchKey, val] of Object.entries(values)) {
      const dbKey = DB_SAVE_KEY_MAP[searchKey] ?? searchKey;
      if (searchKey === 'annual_turnover') {
        const T: Record<string, number> = { under5L: 2.5, '5L_40L': 22.5, '40L_1Cr': 70, '1Cr_10Cr': 550, '10Cr_250Cr': 13000, above250Cr: 30000 };
        dbPayload['annualTurnoverLakhs'] = T[val] ?? null;
      } else if (searchKey === 'total_employees') {
        const E: Record<string, number> = { '1_5': 3, '6_25': 15, '26_100': 60, '101_500': 250, '501_plus': 600 };
        dbPayload['total_employees'] = E[val] ?? null;
      } else if (['differently_abled', 'bpl', 'minority'].includes(searchKey)) {
        dbPayload[dbKey] = val === 'true';
      } else {
        dbPayload[dbKey] = val;
      }
    }

    try {
      const saveRes = await fetch(`${API_BASE_URL}/api/msme-auth/profile/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(dbPayload),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData?.message || 'Failed to save profile');
    } catch (err) {
      console.error('[Schemes] Failed to save missing profile fields:', err);
      throw err;
    }

    setShowMissingFieldsModal(false);
    setMissingFields([]);
    setPendingRawProfile(null);
    await startEligibilityAnalysis(authToken, { refresh: true });
  };

  const dismissMissingFieldsModal = () => setShowMissingFieldsModal(false);

  // ─── Scheme detail (AI engine catalogue) ──────────────────────────────────
  const fetchEngineScheme = async (slug: string): Promise<any | null> => {
    if (schemeDetailCacheRef.current.has(slug)) return schemeDetailCacheRef.current.get(slug);
    try {
      const res = await fetch(`${ELIGIBILITY_URL}/api/schemes/${encodeURIComponent(slug)}`);
      const json = await res.json();
      const scheme = json?.scheme || json?.data || null;
      if (scheme) schemeDetailCacheRef.current.set(slug, scheme);
      return scheme;
    } catch (err) {
      console.error('[Schemes] fetchEngineScheme error:', err);
      return null;
    }
  };

  const adaptEngineSchemeToDetail = (slug: string, s: any) => ({
    _id: slug,
    en: {
      basicDetails: {
        schemeName: s.schemeName, schemeShortTitle: s.schemeShortTitle,
        nodalMinistryName: { label: s.nodalMinistryName || '' }, level: { label: s.level || '' },
        schemeCategory: (s.schemeCategory || []).map((c: string) => ({ label: c })),
        schemeSubCategory: (s.schemeSubCategory || []).map((c: string) => ({ label: c })),
        schemeFor: s.schemeFor || '', schemeType: { label: s.schemeType || '' },
        implementingAgency: s.implementingAgency || '', tags: s.tags || [],
        schemeUrl: s.schemeUrl || s.references?.[0]?.url || '',
        eligibility: s.eligibilityText ? [s.eligibilityText] : [],
      },
      schemeContent: {
        briefDescription: s.briefDescription || '', detailedDescription_md: s.detailedDescription || '',
        benefits_md: s.benefits || '', exclusions_md: s.exclusions || '',
        eligibility_md: s.eligibilityText || '', documentsRequired_md: s.documentsRequired || '',
        references: s.references || [], schemeImageUrl: '',
      },
    },
  });

  const getSchemeDetailBySlug = async (slug: string): Promise<any> => {
    const s = await fetchEngineScheme(slug);
    return s ? adaptEngineSchemeToDetail(slug, s) : null;
  };

  const splitMarkdownList = (md: string): string[] => {
    if (!md || typeof md !== 'string') return [];
    return md.replace(/<br\s*\/?>/gi, '\n').split('\n').map((line) =>
      line.replace(/^#{1,6}\s*/g, '').replace(/^\s*[\d]+\.\s*/, '').replace(/^[\s•\-\*]+/, '')
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim(),
    ).filter((l) => l.length > 2);
  };

  const getSchemeDocuments = async (slugOrId: string): Promise<string[]> => {
    const s = await fetchEngineScheme(slugOrId);
    return s ? splitMarkdownList(s.documentsRequired || '') : [];
  };

  const getSchemeFaqs = async (_slugOrId: string): Promise<any[]> => [];

  const getSchemeApplicationProcess = async (slugOrId: string): Promise<string | null> => {
    const s = await fetchEngineScheme(slugOrId);
    if (!s) return null;
    if (Array.isArray(s.applicationProcess) && s.applicationProcess.length > 0) {
      const text = s.applicationProcess.map((p: any) => p.processText || (p.url ? `Apply online: ${p.url}` : '')).filter(Boolean).join('\n\n');
      if (text) return text;
    }
    if (Array.isArray(s.applicationMode) && s.applicationMode.length > 0) return `Application mode: ${s.applicationMode.join(', ')}`;
    return null;
  };

  const fetchSchemeBySlug = async (slug: string): Promise<Scheme | null> => {
    const s = await fetchEngineScheme(slug);
    if (!s) return null;
    const transformed = mapEngineScheme(s);
    setSchemes((prev) => (prev.some((x) => x.slug === transformed.slug) ? prev : [...prev, transformed]));
    return transformed;
  };

  const refreshSchemes = async () => {
    const authToken = sessionStorage.getItem('msme_auth_token') || token;
    if (!authToken) return;
    setIsLoading(true);
    try {
      const mobile = sessionStorage.getItem('msme_mobile');
      if (!mobile) { setIsLoading(false); return; }
      const profileRes = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobile}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const profileData = await profileRes.json();
      const profile = profileData?.user || {};
      const missing = getMissingFields(profile);
      if (missing.length > 0) {
        setPendingRawProfile(profile);
        setMissingFields(missing);
        setShowMissingFieldsModal(true);
        setIsLoading(false);
        return;
      }
      await startEligibilityAnalysis(authToken, { refresh: true });
    } catch (err) {
      console.error('Error refreshing schemes:', err);
      setAnalysisStatus('error');
      setAnalysisError('Failed to refresh schemes');
    } finally {
      setIsLoading(false);
    }
  };

  const searchSchemes = async (_profile?: any) => { await refreshSchemes(); };

  const getSavedSchemes = async () => {
    const authToken = sessionStorage.getItem('msme_auth_token') || token;
    if (!authToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/user-schemes/bookmarks`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success && data.data?.items) setSavedSchemes(data.data.items.map(transformSchemeItem));
    } catch (err) {
      console.error('Error fetching bookmarked schemes:', err);
      setSavedSchemes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveScheme = async (schemesToSave: Scheme[]): Promise<boolean> => {
    const authToken = sessionStorage.getItem('msme_auth_token') || token;
    if (!authToken) return false;
    try {
      const results = await Promise.all(
        schemesToSave.map((s) =>
          fetch(`${API_BASE_URL}/api/v1/user-schemes/bookmark`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ slug: s.slug || s.id, scheme: toCacheItem(s) }),
          }).then((r) => r.json())
        )
      );
      const allSuccess = results.every((r) => r.success);
      if (allSuccess) setSavedSchemes((prev) => [...prev, ...schemesToSave]);
      return allSuccess;
    } catch (err) {
      console.error('Error bookmarking schemes:', err);
      return false;
    }
  };

  const removeSavedScheme = async (schemeId: string) => {
    const authToken = sessionStorage.getItem('msme_auth_token') || token;
    setSavedSchemes((prev) => prev.filter((s) => s.id !== schemeId));
    if (!authToken) return;
    try {
      await fetch(`${API_BASE_URL}/api/v1/user-schemes/unbookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ slug: schemeId }),
      });
    } catch (err) {
      console.error('Error unbookmarking scheme:', err);
    }
  };

  const getSchemeById = (id: string): Scheme | undefined => schemes.find((s) => s.id === id);

  const getTotalPages = (): number => Math.ceil(getFilteredSchemes().length / itemsPerPage);

  const getFilteredSchemes = (): Scheme[] => {
    return schemes.filter((scheme) => {
      const matchesSearch =
        searchQuery === '' ||
        scheme.schemeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scheme.briefDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedFilters.category.length === 0 ||
        scheme.schemeCategory.some((cat) => selectedFilters.category.includes(cat));
      const matchesMinistry = selectedFilters.ministry.length === 0 ||
        selectedFilters.ministry.includes(scheme.nodalMinistryName);
      const matchesState = selectedFilters.state.length === 0 ||
        scheme.beneficiaryState.some((s) => selectedFilters.state.includes(s));
      const matchesLevel = selectedFilters.level.length === 0 ||
        selectedFilters.level.includes(scheme.schemeLevel);
      const matchesType = selectedFilters.type.length === 0 ||
        scheme.tags.some((tag) => selectedFilters.type.includes(tag));
      return matchesSearch && matchesCategory && matchesMinistry && matchesState && matchesLevel && matchesType;
    });
  };

  const value: SchemesContextType = {
    schemes, savedSchemes, searchQuery, selectedFilters, filterOptions, isLoading, currentPage,
    itemsPerPage, missingFields, showMissingFieldsModal,
    analysisStatus, analysisError, analysisProgress,
    eligibleItems, needsInfoItems, ineligibleItems, actionableItems, questions, isSubmittingAnswers, sessionId, lastUpdated,
    setSearchQuery, setSelectedFilters, loadSchemesForDashboard, searchSchemes, saveScheme,
    removeSavedScheme, getSavedSchemes, getSchemeById, setCurrentPage, getTotalPages, getFilteredSchemes,
    submitMissingFields, dismissMissingFieldsModal, getSchemeDetailBySlug, getSchemeDocuments,
    getSchemeFaqs, getSchemeApplicationProcess, fetchSchemeBySlug, refreshSchemes, submitQuestionAnswers,
  };

  return <SchemesContext.Provider value={value}>{children}</SchemesContext.Provider>;
};

export const useSchemes = () => {
  const context = useContext(SchemesContext);
  if (context === undefined) throw new Error('useSchemes must be used within SchemesProvider');
  return context;
};

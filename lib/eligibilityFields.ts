// Canonical eligibility-profile field definitions + completeness logic.
//
// Single source of truth shared by:
//   • SchemesContext (the in-dashboard "missing fields" modal + re-run gating)
//   • the dedicated profile-onboarding page (new-user flow)
//   • the onboarding stage resolver (decides whether profile is complete)
//
// Keeping this in one place ensures the onboarding step and the dashboard never
// disagree about which details are required to analyse schemes.

export type MissingField = {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  options?: { value: string; label: string }[];
};

export const REQUIRED_SEARCH_FIELDS: MissingField[] = [
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
    key: 'is_startup',
    label: 'Is your business a Startup?',
    type: 'select',
    options: [
      { value: 'true',  label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  },
  {
    key: 'udyam_registered',
    label: 'Is your business Udyam (MSME) registered?',
    type: 'select',
    options: [
      { value: 'true',  label: 'Yes' },
      { value: 'false', label: 'No' },
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

export const SECTOR_NORMALISE_MAP: Record<string, string> = {
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

export const PROFILE_SOURCE_MAP: Record<string, (p: Record<string, any>) => any> = {
  sector:            (p) => p.sector || p.businessSector || p.business_sector,
  msme_size:         (p) => p.enterpriseCategory || p.enterprise_category || p.msme_size,
  annual_turnover:   (p) => p.annualTurnoverLakhs || p.annual_turnover_lakhs || p.annual_turnover,
  total_employees:   (p) => p.total_employees || p.totalEmployees,
  business_type:     (p) => p.businessType || p.business_type || p.entityType || p.entity_type,
  business_stage:    (p) => p.businessStage || p.business_stage,
  is_startup:        (p) => {
    const v = p.isStartup ?? p.is_startup;
    return (v !== undefined && v !== null) ? String(v) : undefined;
  },
  udyam_registered:  (p) => {
    const v = p.udyamRegistered ?? p.udyam_registered;
    return (v !== undefined && v !== null) ? String(v) : undefined;
  },
  benefit_focus:     (p) => p.benefitFocus || p.benefit_focus,
  state:             (p) => p.state || p.principalState,
  gender:            (p) => p.gender,
  caste:             (p) => p.caste || (Array.isArray(p.socialCategory) ? p.socialCategory[0] : p.socialCategory),
  age:               (p) => p.age,
  differently_abled: (p) => (p.differently_abled !== undefined && p.differently_abled !== null) ? String(p.differently_abled) : undefined,
  bpl:               (p) => (p.bpl !== undefined && p.bpl !== null) ? String(p.bpl) : undefined,
  minority:          (p) => (p.minority !== undefined && p.minority !== null) ? String(p.minority) : undefined,
};

export const DB_SAVE_KEY_MAP: Record<string, string> = {
  sector: 'businessSector', msme_size: 'enterpriseCategory', annual_turnover: 'annualTurnoverLakhs',
  total_employees: 'total_employees', business_type: 'businessType', business_stage: 'businessStage',
  benefit_focus: 'benefitFocus', state: 'state', gender: 'gender', caste: 'caste', age: 'age',
  differently_abled: 'differently_abled', bpl: 'bpl', minority: 'minority',
  udyam_registered: 'udyamRegistered', is_startup: 'isStartup',
};

export function getMissingFields(rawProfile: Record<string, any>): MissingField[] {
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

/**
 * Translate the onboarding/missing-field answers (keyed by REQUIRED_SEARCH_FIELDS
 * `key`) into the DB column payload expected by POST /api/msme-auth/profile/eligibility.
 */
export function buildEligibilityDbPayload(values: Record<string, any>): Record<string, any> {
  const dbPayload: Record<string, any> = {};
  for (const [searchKey, val] of Object.entries(values)) {
    const dbKey = DB_SAVE_KEY_MAP[searchKey] ?? searchKey;
    if (searchKey === 'annual_turnover') {
      const T: Record<string, number> = { under5L: 2.5, '5L_40L': 22.5, '40L_1Cr': 70, '1Cr_10Cr': 550, '10Cr_250Cr': 13000, above250Cr: 30000 };
      dbPayload['annualTurnoverLakhs'] = T[val] ?? null;
    } else if (searchKey === 'total_employees') {
      const E: Record<string, number> = { '1_5': 3, '6_25': 15, '26_100': 60, '101_500': 250, '501_plus': 600 };
      dbPayload['total_employees'] = E[val] ?? null;
    } else if (['differently_abled', 'bpl', 'minority', 'udyam_registered', 'is_startup'].includes(searchKey)) {
      dbPayload[dbKey] = val === 'true';
    } else {
      dbPayload[dbKey] = val;
    }
  }
  return dbPayload;
}

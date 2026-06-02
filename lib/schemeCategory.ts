// Buckets an eligible scheme into a benefit-type category for the dashboard,
// using the scheme's benefits text, benefitTypes, tags, name and description.

export interface SchemeCategory {
  key: string;
  label: string;
}

// Ordered by priority — the first matching category wins.
const RULES: { key: string; label: string; re: RegExp }[] = [
  { key: 'loan',       label: 'Loans & Credit',          re: /\bloan\b|credit guarantee|working capital|term loan|cgtmse|\bmudra\b|collateral|line of credit|cash credit|overdraft|refinanc/i },
  { key: 'equity',     label: 'Equity & Investment',     re: /\bequity\b|venture (capital|fund)|fund of funds|angel|investment|share capital|stake/i },
  { key: 'seed',       label: 'Seed Funding & Grants',   re: /seed (fund|capital|support)|\bgrant\b|financial assistance|funding support|corpus|incentive grant/i },
  { key: 'subsidy',    label: 'Subsidies',               re: /subsid|reimburs|interest subvention|interest subsidy|capital subsidy|rebate/i },
  { key: 'award',      label: 'Awards & Recognition',    re: /\baward\b|recognition|\bprize\b|felicitat|honou?r|excellence award/i },
  { key: 'tax',        label: 'Tax Benefits',            re: /\btax\b|gst|exemption|duty (exemption|drawback)|income tax|tax holiday/i },
  { key: 'incubation', label: 'Incubation & Training',   re: /incubat|accelerat|\btraining\b|skill|mentor|capacity building|entrepreneurship development|\bedp\b/i },
  { key: 'market',     label: 'Marketing & Infrastructure', re: /market(ing| access|ing assistance)|exhibition|trade fair|stall|infrastructure|cluster|export promotion|branding/i },
  { key: 'tech',       label: 'Technology & Certification', re: /technolog|patent|\bipr\b|quality certif|\bzed\b|testing|r&d|research|innovation|certification/i },
];

const OTHER: SchemeCategory = { key: 'other', label: 'Other Benefits' };

// Stable display order for the dashboard sections.
export const CATEGORY_ORDER = [
  'loan', 'seed', 'equity', 'subsidy', 'award', 'tax', 'incubation', 'market', 'tech', 'other',
];

export function categorizeScheme(scheme: any): SchemeCategory {
  const hay = [
    scheme?.benefitTypes,
    scheme?.benefits,
    scheme?.schemeName,
    scheme?.briefDescription,
    Array.isArray(scheme?.tags) ? scheme.tags.join(' ') : '',
    Array.isArray(scheme?.schemeCategory) ? scheme.schemeCategory.join(' ') : '',
  ].filter(Boolean).join('\n');

  for (const rule of RULES) {
    if (rule.re.test(hay)) return { key: rule.key, label: rule.label };
  }
  return OTHER;
}

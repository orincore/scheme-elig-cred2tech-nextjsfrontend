'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSchemes, SchemeDecisionItem, Scheme, SchemeDecision } from '@/contexts/SchemesContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2, XCircle, HelpCircle, Bookmark, BookmarkCheck, ArrowRight,
  Gift, ChevronDown, ChevronUp, Building2, ShieldCheck, FileText, Circle, ListChecks, Target,
  Loader2, Pencil, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildDocMatches, getOwnedDocs, OwnedDocs } from '@/lib/documentMatch';

function stripMd(text: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toScheme(s: any): Scheme {
  const slug = s.slug || s._id || '';
  return {
    id: slug, slug,
    schemeName: s.schemeName || s.schemeShortTitle || '',
    nodalMinistryName: s.nodalMinistryName || '',
    briefDescription: s.briefDescription || '',
    schemeLevel: s.level || s.schemeLevel || '',
    tags: s.tags || [],
    schemeCloseDate: s.schemeCloseDate || null,
    schemeCategory: s.schemeCategory || [],
    schemeFor: s.schemeFor || '',
    beneficiaryState: s.eligibility?.beneficiaryState || [],
  };
}

const THEME = {
  ELIGIBLE:   { accent: 'bg-emerald-500', pill: 'text-emerald-700 bg-emerald-50 ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-900', dot: 'bg-emerald-500', label: 'Eligible', Icon: CheckCircle2 },
  NEEDS_INFO: { accent: 'bg-amber-500',   pill: 'text-amber-700 bg-amber-50 ring-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:ring-amber-900', dot: 'bg-amber-500', label: 'Needs info', Icon: HelpCircle },
  ACTIONABLE: { accent: 'bg-indigo-500',  pill: 'text-indigo-700 bg-indigo-50 ring-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/30 dark:ring-indigo-900', dot: 'bg-indigo-500', label: 'Could qualify', Icon: Target },
  INELIGIBLE: { accent: 'bg-slate-300 dark:bg-slate-700', pill: 'text-slate-500 bg-slate-50 ring-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:ring-slate-800', dot: 'bg-slate-400', label: 'Not eligible', Icon: XCircle },
} as const;

// Compact answer input for a clarification, matching the popup's controls.
function ClarInput({
  clar, value, onChange, disabled,
}: {
  clar: NonNullable<SchemeDecision['clarification']>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const fmt = (clar.expected_format || '').toLowerCase();
  const isYesNo = fmt === 'yes_no' || fmt === 'boolean' || fmt === 'yesno';
  if (isYesNo) {
    return (
      <div className="flex gap-2">
        {['yes', 'no'].map((opt) => (
          <button key={opt} type="button" disabled={disabled} onClick={() => onChange(opt)}
            className={`flex-1 px-3 py-1.5 rounded-lg border text-[13px] font-medium capitalize transition-all ${
              value === opt ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-primary/5'
            }`}>{opt}</button>
        ))}
      </div>
    );
  }
  if (clar.options && clar.options.length > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {clar.options.map((opt) => (
          <button key={opt} type="button" disabled={disabled} onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg border text-[13px] transition-all ${
              value === opt ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-primary/5'
            }`}>{opt}</button>
        ))}
      </div>
    );
  }
  return (
    <Input type={fmt === 'number' ? 'number' : 'text'} value={value} disabled={disabled}
      placeholder="Type your answer" className="h-9 text-[13px]"
      onChange={(e) => onChange(e.target.value)} />
  );
}

// Inline "answer / modify clarification → re-check eligibility" block, shown on
// Needs-info cards (to answer) and on any card the user has already answered (to
// fix a wrong answer). Re-checks just this scheme and updates its verdict.
function ClarificationAnswer({ slug, decision }: { slug: string; decision: SchemeDecision }) {
  const { submitSingleAnswer } = useSchemes();
  const clar = decision.clarification;
  const answered = decision.answeredValue;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(answered ?? '');
  const [submitting, setSubmitting] = useState(false);

  if (!clar?.field_id) return null;

  const submit = async () => {
    const v = value.trim();
    if (!v) { toast.error('Please provide an answer'); return; }
    setSubmitting(true);
    const res = await submitSingleAnswer(slug, clar.field_id!, v);
    setSubmitting(false);
    if (!res.ok) { toast.error('Couldn’t re-check. Please try again.'); return; }
    setEditing(false);
    toast.success(
      res.verdict === 'ELIGIBLE' ? 'Great news — you’re now eligible!'
        : res.verdict === 'INELIGIBLE' ? 'Updated — not eligible based on your answer.'
        : 'Answer updated.',
    );
  };

  // Already answered, not editing → show the answer with an Edit affordance.
  if (answered && !editing) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your answer</p>
            <p className="text-[13px] font-medium text-foreground capitalize truncate">{answered}</p>
          </div>
          <button type="button" onClick={() => { setValue(answered); setEditing(true); }}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline shrink-0">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{clar.question}</p>
      </div>
    );
  }

  // Unanswered (Needs-info) OR editing → question + input + re-check.
  return (
    <div className="rounded-lg border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-3 space-y-2.5">
      <p className="text-[13px] text-foreground">{clar.question}</p>
      {clar.why_needed && <p className="text-[11px] text-muted-foreground -mt-1">{clar.why_needed}</p>}
      <ClarInput clar={clar} value={value} onChange={setValue} disabled={submitting} />
      <div className="flex items-center gap-2 pt-0.5">
        <Button size="sm" className="h-8 text-[12px]" onClick={submit} disabled={submitting || !value.trim()}>
          {submitting
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Re-checking…</>
            : answered
              ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Re-check</>
              : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Check eligibility</>}
        </Button>
        {answered && (
          <Button size="sm" variant="ghost" className="h-8 text-[12px]" disabled={submitting}
            onClick={() => { setEditing(false); setValue(answered); }}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SchemeDecisionCard({ item, ownedDocs }: { item: SchemeDecisionItem; ownedDocs?: OwnedDocs }) {
  const { saveScheme, removeSavedScheme, savedSchemes } = useSchemes();
  const [showBenefits, setShowBenefits] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const { scheme, decision } = item;
  const t = THEME[decision.verdict] || THEME.INELIGIBLE;
  const slug = scheme.slug;
  const isSaved = savedSchemes.some((s) => s.id === slug || s.slug === slug);

  const handleSave = () => {
    if (isSaved) { removeSavedScheme(slug); toast.success('Removed from saved'); }
    else { saveScheme([toScheme(scheme)]); toast.success('Scheme saved'); }
  };

  const benefitsText = stripMd(scheme.benefits || '');
  const benefitsShort = benefitsText.length > 240 ? benefitsText.slice(0, 240) + '…' : benefitsText;
  const criteria = decision.verified_criteria || [];
  const reasons = decision.reasons || [];
  const clar = decision.clarification;
  const steps = decision.actionable_steps || [];
  const matchLabel = decision.confidence === 'high' ? 'Strong match' : decision.confidence === 'medium' ? 'Good match' : null;

  // Documents required for this scheme, flagged with the ones the user already holds.
  const owned = ownedDocs || getOwnedDocs(null);
  const docMatches = buildDocMatches(scheme.documentsRequired || '', owned);
  const matchedCount = docMatches.filter((d) => d.matchedKey).length;
  const docsToShow = showDocs ? docMatches : docMatches.slice(0, 4);

  return (
    <Card className="elig-card-in group relative flex flex-col overflow-hidden p-0 rounded-none border border-border bg-card hover:border-primary/40 transition-colors">
      <div className="flex flex-col gap-3 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/scheme/${slug}`}>
              <h3 className="text-[15px] font-semibold text-foreground leading-snug hover:text-primary transition-colors line-clamp-2">
                {scheme.schemeName}
              </h3>
            </Link>
            {scheme.nodalMinistryName && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{scheme.nodalMinistryName}</span>
              </p>
            )}
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${t.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /> {t.label}
          </span>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {scheme.level && <Badge variant="outline" className="text-[11px] font-normal">{scheme.level}</Badge>}
          {(scheme.schemeCategory || []).slice(0, 1).map((c: string) => (
            <Badge key={c} variant="secondary" className="text-[11px] font-normal">{c}</Badge>
          ))}
          {decision.verdict === 'ELIGIBLE' && matchLabel && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" /> {matchLabel}
            </span>
          )}
          {decision.reverified && <Badge variant="outline" className="text-[11px] font-normal">Updated</Badge>}
        </div>

        {scheme.briefDescription && (
          <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-2">{stripMd(scheme.briefDescription)}</p>
        )}

        {/* ELIGIBLE — what matched */}
        {decision.verdict === 'ELIGIBLE' && (criteria.length > 0 || reasons.length > 0) && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why you qualify</p>
            <ul className="space-y-1.5">
              {(criteria.length > 0 ? criteria : reasons).slice(0, 4).map((c, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-foreground/90">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-px" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* NEEDS_INFO question — or, for an already-answered scheme, the answer
            with an Edit control. Answering/modifying re-checks just this scheme
            and updates its verdict. */}
        {clar?.field_id && (decision.verdict === 'NEEDS_INFO' || decision.answeredValue) && (
          <ClarificationAnswer slug={slug} decision={decision} />
        )}

        {/* ACTIONABLE — steps to become eligible */}
        {decision.verdict === 'ACTIONABLE' && (
          <div className="space-y-2.5">
            {reasons.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Not yet — because</p>
                <ul className="space-y-1">
                  {reasons.slice(0, 2).map((r, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                      <Circle className="w-4 h-4 text-indigo-300 shrink-0 mt-px" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-lg border border-indigo-200/70 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/10 p-3">
              <p className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 mb-1.5">
                <span className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Steps to qualify</span>
                {decision.difficulty && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${decision.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                    {decision.difficulty === 'easy' ? 'Easy' : 'Moderate'}
                  </span>
                )}
              </p>
              <ol className="space-y-1.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-foreground/90">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-semibold text-white mt-px">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* INELIGIBLE — why not */}
        {decision.verdict === 'INELIGIBLE' && reasons.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why it doesn&apos;t fit</p>
            <ul className="space-y-1.5">
              {reasons.slice(0, 3).map((r, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                  <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Benefits */}
        {benefitsText && decision.verdict !== 'INELIGIBLE' && (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              <Gift className="w-3.5 h-3.5" /> What you get
            </p>
            <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-line">
              {showBenefits ? benefitsText : benefitsShort}
            </p>
            {benefitsText.length > 240 && (
              <button onClick={() => setShowBenefits((s) => !s)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                {showBenefits ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Read more <ChevronDown className="w-3 h-3" /></>}
              </button>
            )}
          </div>
        )}

        {/* Documents required — with the ones you already have flagged */}
        {decision.verdict !== 'INELIGIBLE' && docMatches.length > 0 && (
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <FileText className="w-3.5 h-3.5" /> Documents required
              </p>
              {matchedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900">
                  <CheckCircle2 className="w-3 h-3" /> You have {matchedCount} of {docMatches.length}
                </span>
              )}
            </div>
            <ul className="space-y-1.5">
              {docsToShow.map((d, i) => (
                <li key={i} className="flex gap-2 text-[13px]">
                  {d.matchedKey ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-px" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-px" />
                  )}
                  <span className={d.matchedKey ? 'text-foreground/90' : 'text-muted-foreground'}>
                    {d.text}
                    {d.matchedKey && (
                      <span className="ml-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">· you have this</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {docMatches.length > 4 && (
              <button onClick={() => setShowDocs((s) => !s)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                {showDocs ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Show all {docMatches.length} <ChevronDown className="w-3 h-3" /></>}
              </button>
            )}
          </div>
        )}

        {decision.important_notes && (
          <p className="text-[12px] text-muted-foreground border-l-2 border-border pl-3">
            <span className="font-medium text-foreground">Note: </span>{stripMd(decision.important_notes)}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3 pl-6">
        <Link href={`/scheme/${slug}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:gap-1.5 transition-all">
          View details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Button onClick={handleSave} variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
          {isSaved ? <><BookmarkCheck className="w-4 h-4 mr-1.5 text-primary" /> Saved</> : <><Bookmark className="w-4 h-4 mr-1.5" /> Save</>}
        </Button>
      </div>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft, Building2, CheckCircle2, XCircle, HelpCircle, Target,
  Gift, FileText, ListOrdered, ExternalLink, Tag, Landmark, Award,
  AlertCircle, Circle,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripMd(text = '') {
  return text
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/^#{1,6}\s*/gm, '').replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1').replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function parseBlocks(text: string): { type: 'heading' | 'item'; text: string }[] {
  if (!text?.trim()) return [];
  return text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .split('\n').map(line => {
      const t = line.trim();
      if (!t) return null;
      const isH = /^#{1,6}\s/.test(t) || /^\*{2,3}[^*\n]+\*{2,3}$/.test(t);
      const clean = t.replace(/^#{1,6}\s*/, '').replace(/^[\s•\-]+/, '')
        .replace(/^\d+\.\s+/, '').replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').trim();
      if (!clean || clean.length < 2) return null;
      return { type: (isH ? 'heading' : 'item') as 'heading' | 'item', text: clean };
    }).filter((b): b is { type: 'heading' | 'item'; text: string } => b !== null);
}

const VERDICT_THEME = {
  ELIGIBLE:   { pill: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-900', dot: 'bg-emerald-500', label: 'Eligible',      Icon: CheckCircle2 },
  NEEDS_INFO: { pill: 'text-amber-700 bg-amber-50 ring-1 ring-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:ring-amber-900',           dot: 'bg-amber-500',   label: 'Needs Info',    Icon: HelpCircle   },
  ACTIONABLE: { pill: 'text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/30 dark:ring-indigo-900',     dot: 'bg-indigo-500',  label: 'Could Qualify', Icon: Target       },
  INELIGIBLE: { pill: 'text-slate-500 bg-slate-50 ring-1 ring-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:ring-slate-800',              dot: 'bg-slate-400',   label: 'Not Eligible',  Icon: XCircle      },
} as const;

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-[13px] font-bold text-foreground uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Block renderer (for benefits / eligibility / application process) ────────

function BlockList({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return <p className="text-[13px] text-muted-foreground">{stripMd(text)}</p>;
  return (
    <div className="space-y-1.5">
      {blocks.map((b, i) =>
        b.type === 'heading' ? (
          <p key={i} className="text-[13px] font-semibold text-foreground mt-3 first:mt-0">{b.text}</p>
        ) : (
          <div key={i} className="flex gap-2 text-[13px] text-foreground/90">
            <Circle className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-[6px] shrink-0" />
            <span className="leading-relaxed">{b.text}</span>
          </div>
        )
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoSchemePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;

  const [schemeItem, setSchemeItem] = useState<any>(null);
  const [extraData, setExtraData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    // 1. Try to find the item in sessionStorage (stored by demo dashboard on analysis)
    let foundItem: any = null;
    try {
      const stored = sessionStorage.getItem('demo_snapshot_items');
      if (stored) {
        const items: any[] = JSON.parse(stored);
        foundItem = items.find(it => it.scheme?.slug === slug || it.scheme?._id === slug);
      }
    } catch { /* ignore */ }

    if (foundItem) setSchemeItem(foundItem);

    // 2. Fetch extra scheme details from the public eligibility engine endpoint
    const ELIGIBILITY_URL = process.env.NEXT_PUBLIC_ELIGIBILITY_URL || 'http://localhost:4000';
    fetch(`${ELIGIBILITY_URL}/api/schemes/${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setExtraData(data);
      })
      .catch(() => { /* non-fatal — we still have snapshot data */ })
      .finally(() => setLoading(false));

    if (!foundItem) setLoading(true);
  }, [slug]);

  useEffect(() => {
    if (schemeItem || extraData) setLoading(false);
  }, [schemeItem, extraData]);

  // Merge snapshot scheme data with any extra fetched data
  const scheme = { ...(extraData || {}), ...(schemeItem?.scheme || {}) };
  const decision = schemeItem?.decision;
  const verdict = decision?.verdict as keyof typeof VERDICT_THEME | undefined;
  const vt = verdict ? VERDICT_THEME[verdict] : null;

  const benefitsText = stripMd(scheme.benefits || extraData?.benefits || '');
  const eligibilityText = stripMd(
    scheme.eligibility?.description || scheme.eligibilityText || extraData?.eligibility?.description || ''
  );
  const applicationText = stripMd(
    scheme.applicationProcess || extraData?.applicationProcess || ''
  );
  const docsText = stripMd(scheme.documentsRequired || extraData?.documentsRequired || '');
  const tags: string[] = scheme.tags || extraData?.tags || [];
  const categories: string[] = scheme.schemeCategory || scheme.schemeFor ? [scheme.schemeFor] : (extraData?.schemeCategory || []);
  const schemeUrl = scheme.schemeUrl || scheme.officialLink || extraData?.schemeUrl || null;

  if (loading && !schemeItem && !extraData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 max-w-5xl mx-auto">
            <BrandLogo size="small" />
            <div className="flex-1" />
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid gap-4 mt-6"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        </main>
      </div>
    );
  }

  if (!scheme.schemeName && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-foreground font-semibold">Scheme not found</p>
          <p className="text-[13px] text-muted-foreground">Return to the demo dashboard to re-run the analysis first.</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/demo/dashboard')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6 max-w-5xl mx-auto">
          <Link href="/demo/dashboard" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">

        {/* Title block */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground leading-snug">{scheme.schemeName}</h1>
              {scheme.nodalMinistryName && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" /> {scheme.nodalMinistryName}
                </p>
              )}
            </div>
            {vt && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shrink-0 ${vt.pill}`}>
                <span className={`h-2 w-2 rounded-full ${vt.dot}`} /> {vt.label}
              </span>
            )}
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            {(scheme.level || scheme.schemeLevel) && (
              <span className="inline-flex items-center gap-1 border border-border rounded-full px-3 py-1 text-[12px] text-foreground/70">
                <Landmark className="h-3 w-3" /> {scheme.level || scheme.schemeLevel}
              </span>
            )}
            {categories.slice(0, 3).map((c: string) => (
              <span key={c} className="inline-flex items-center gap-1 border border-border rounded-full px-3 py-1 text-[12px] bg-secondary text-foreground/70">
                <Award className="h-3 w-3" /> {c}
              </span>
            ))}
            {tags.slice(0, 4).map((t: string) => (
              <span key={t} className="inline-flex items-center gap-1 border border-border rounded-full px-3 py-1 text-[12px] text-muted-foreground">
                <Tag className="h-3 w-3" /> {t}
              </span>
            ))}
          </div>

          {schemeUrl && (
            <a href={schemeUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
              Official website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* AI eligibility verdict — from stored snapshot decision */}
        {decision && vt && (
          <Section icon={vt.Icon} title="Your Eligibility">
            <div className="space-y-3">
              {/* ELIGIBLE */}
              {verdict === 'ELIGIBLE' && (
                <>
                  {(decision.verified_criteria?.length || decision.reasons?.length) ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Why you qualify</p>
                      <ul className="space-y-2">
                        {(decision.verified_criteria?.length ? decision.verified_criteria : decision.reasons).map((r: string, i: number) => (
                          <li key={i} className="flex gap-2 text-[13px] text-foreground/90">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-px" /> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}

              {/* ACTIONABLE */}
              {verdict === 'ACTIONABLE' && (
                <div className="space-y-3">
                  {decision.reasons?.length ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Not yet — because</p>
                      <ul className="space-y-1.5">
                        {decision.reasons.slice(0, 3).map((r: string, i: number) => (
                          <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                            <Circle className="h-4 w-4 text-indigo-300 shrink-0 mt-px" /> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {decision.actionable_steps?.length ? (
                    <div className="rounded border border-indigo-200/70 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/10 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 mb-2">Steps to qualify</p>
                      <ol className="space-y-2">
                        {decision.actionable_steps.map((s: string, i: number) => (
                          <li key={i} className="flex gap-2 text-[13px] text-foreground/90">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white mt-px">{i + 1}</span>
                            {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              )}

              {/* NEEDS_INFO */}
              {verdict === 'NEEDS_INFO' && decision.clarification?.question && (
                <div className="rounded border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-4">
                  <p className="text-[13px] font-medium text-foreground">{decision.clarification.question}</p>
                  {decision.clarification.why_needed && (
                    <p className="text-[12px] text-muted-foreground mt-1">{decision.clarification.why_needed}</p>
                  )}
                </div>
              )}

              {/* INELIGIBLE */}
              {verdict === 'INELIGIBLE' && decision.reasons?.length ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Why it doesn&apos;t fit</p>
                  <ul className="space-y-1.5">
                    {decision.reasons.slice(0, 4).map((r: string, i: number) => (
                      <li key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                        <XCircle className="h-4 w-4 text-slate-400 shrink-0 mt-px" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {decision.important_notes && (
                <p className="text-[12px] text-muted-foreground border-l-2 border-border pl-3 mt-2">
                  <span className="font-semibold text-foreground">Note: </span>{stripMd(decision.important_notes)}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* Brief description */}
        {scheme.briefDescription && (
          <Section icon={FileText} title="About this Scheme">
            <p className="text-[13px] leading-relaxed text-foreground/90">{stripMd(scheme.briefDescription)}</p>
          </Section>
        )}

        {/* Benefits */}
        {benefitsText && (
          <Section icon={Gift} title="What You Get">
            <BlockList text={benefitsText} />
          </Section>
        )}

        {/* Eligibility criteria */}
        {eligibilityText && (
          <Section icon={CheckCircle2} title="Eligibility Criteria">
            <BlockList text={eligibilityText} />
          </Section>
        )}

        {/* Documents required */}
        {docsText && (
          <Section icon={FileText} title="Documents Required">
            <BlockList text={docsText} />
          </Section>
        )}

        {/* Application process */}
        {applicationText && (
          <Section icon={ListOrdered} title="How to Apply">
            <BlockList text={applicationText} />
          </Section>
        )}

        {/* CTA */}
        <div className="border border-border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-foreground">Ready to apply for this scheme?</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Unlock full guidance, document checklist and step-by-step support on the real platform.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {schemeUrl && (
              <a href={schemeUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Official site
                </Button>
              </a>
            )}
            <Button size="sm" onClick={() => router.push('/demo/dashboard')} className="gap-1.5">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to schemes
            </Button>
          </div>
        </div>

      </main>
    </div>
  );
}

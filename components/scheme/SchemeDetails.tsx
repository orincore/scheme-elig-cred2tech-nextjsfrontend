'use client';

import { useState, useEffect } from 'react';
import { useSchemes } from '@/contexts/SchemesContext';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { Scheme } from '@/contexts/SchemesContext';
import {
  Bookmark, BookmarkCheck, ExternalLink, ChevronLeft,
  Check, Loader2, Sparkles, ChevronDown, ChevronUp,
  FileText, Shield, Star, ListOrdered, HelpCircle, Link2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { casesApi } from '@/lib/services/api';

// ── Text helpers ──────────────────────────────────────────────────────────────

/**
 * Decode HTML entities in two passes so double-encoded strings
 * (e.g. &amp;#39; → &#39; → ') are also handled correctly.
 */
function decodeHtml(raw: string): string {
  if (!raw) return raw;

  // Pass 1: collapse one level of &amp; encoding so &amp;#39; → &#39;, &amp;quot; → &quot; etc.
  let s = raw.replace(/&amp;/g, '&');

  // Pass 2: all named and numeric entities
  s = s
    // Quotes / apostrophes
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    // Punctuation
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&bull;/g, '•')
    .replace(/&middot;/g, '·')
    // Comparators
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&le;/g, '≤')
    .replace(/&ge;/g, '≥')
    .replace(/&ne;/g, '≠')
    // Maths / symbols
    .replace(/&times;/g, '×')
    .replace(/&divide;/g, '÷')
    .replace(/&plusmn;/g, '±')
    .replace(/&deg;/g, '°')
    .replace(/&frac12;/g, '½')
    .replace(/&frac14;/g, '¼')
    .replace(/&frac34;/g, '¾')
    // Intellectual property
    .replace(/&trade;/g, '™')
    .replace(/&reg;/g, '®')
    .replace(/&copy;/g, '©')
    // Arrows
    .replace(/&rarr;/g, '→')
    .replace(/&larr;/g, '←')
    .replace(/&uarr;/g, '↑')
    .replace(/&darr;/g, '↓')
    // Whitespace
    .replace(/&nbsp;/g, ' ')
    // Decimal numeric entities  &#NNN;
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    // Hex numeric entities  &#xHH;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    // Collapse multiple spaces from &nbsp; runs
    .replace(/ {2,}/g, ' ');

  return s;
}

function cleanMarkdown(text: string): string {
  if (!text) return text;
  return decodeHtml(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')           // strip any remaining HTML tags
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type MdBlock = { type: 'heading'; text: string } | { type: 'item'; text: string };

function parseMarkdownBlocks(text: string): MdBlock[] {
  if (!text) return [];
  return decodeHtml(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')           // strip HTML tags
    .split('\n')
    .map((line: string): MdBlock | null => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const isHeading =
        /^#{1,6}\s/.test(trimmed) ||
        /^\*{2,3}[^*\n]+\*{2,3}$/.test(trimmed) ||
        /^#{1,6}\s*\*{2,3}[^*\n]+\*{2,3}$/.test(trimmed);
      const clean = trimmed
        .replace(/^#{1,6}\s*/g, '')
        .replace(/^[\s•\-]+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
        .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
        .trim();
      if (!clean || clean.length < 2) return null;
      return { type: isHeading ? 'heading' : 'item', text: clean };
    })
    .filter((b): b is MdBlock => b !== null);
}

// ── Eligibility parser ────────────────────────────────────────────────────────

type EligBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'item';    text: string }
  | { kind: 'note';    label: string; text: string };

function stripInlineMarkdown(s: string): string {
  return s
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function parseEligibilityText(raw: string): EligBlock[] {
  if (!raw?.trim()) return [];

  const text = decodeHtml(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const blocks: EligBlock[] = [];

  // Process each line independently (most items are single-line blobs)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Extract a leading heading marker (##### heading text)
    let rest = line;
    const headingMatch = line.match(/^#{1,6}\s+(.+)/);
    if (headingMatch) {
      const afterHash = headingMatch[1];
      // The heading may run into list items inline: "Eligible borrowers - Individuals - ..."
      const firstDash = afterHash.indexOf(' - ');
      if (firstDash === -1) {
        // Pure heading with no list items after it
        const hText = stripInlineMarkdown(afterHash);
        if (hText) blocks.push({ kind: 'heading', text: hText });
        continue;
      }
      // Heading + inline list items
      const hText = stripInlineMarkdown(afterHash.slice(0, firstDash));
      if (hText) blocks.push({ kind: 'heading', text: hText });
      rest = afterHash.slice(firstDash + 3);
    }

    // Split remaining text on **Note (notes come after the list items)
    const noteSplit = rest.split(/(?=\*{1,2}Note)/i);

    // ── List items (first segment)
    if (noteSplit[0]) {
      // Items are separated by " - " (dash-space pattern)
      const rawItems = noteSplit[0]
        .split(/ - (?=[A-Z])/g)   // split on " - Uppercase" to avoid splitting mid-sentence
        .flatMap(seg => seg.split(/ - /))  // then split remaining
        .map(s => s.trim())
        .filter(s => s.length > 1);

      for (const item of rawItems) {
        const cleaned = stripInlineMarkdown(
          item.replace(/^[-•]\s*/, '').replace(/^\d+\.\s+/, '')
        );
        if (cleaned.length > 1) blocks.push({ kind: 'item', text: cleaned });
      }
    }

    // ── Notes (**Note 01:** text...)
    for (let i = 1; i < noteSplit.length; i++) {
      const seg = noteSplit[i];
      // Match **Note XX:** or **Note:** patterns
      const m = seg.match(/^\*{1,2}(Note\s*[\d]*)\s*:?\s*\*{1,2}:?\s*([\s\S]+)/i);
      if (m) {
        const label = m[1].trim();
        const noteText = stripInlineMarkdown(m[2].trim());
        if (noteText) blocks.push({ kind: 'note', label, text: noteText });
      } else {
        const cleaned = stripInlineMarkdown(seg.replace(/^[-•]\s*/, '').trim());
        if (cleaned.length > 1) blocks.push({ kind: 'item', text: cleaned });
      }
    }
  }

  return blocks;
}

// Render a single eligibility criterion (may be simple or complex)
function EligibilityItem({ criterion }: { criterion: string }) {
  const blocks = parseEligibilityText(criterion);

  // Simple single-item — render as a regular check-list row
  if (blocks.length === 1 && blocks[0].kind === 'item') {
    return (
      <li className="flex gap-3 items-start">
        <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center shrink-0 mt-0.5">
          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
        </span>
        <span className="text-sm text-foreground leading-relaxed">{blocks[0].text}</span>
      </li>
    );
  }

  // Complex block — render with hierarchy
  return (
    <li className="space-y-2 pb-2 border-b border-border last:border-0 last:pb-0">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <p key={i} className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.08em] mt-2 first:mt-0">
              {b.text}
            </p>
          );
        }
        if (b.kind === 'item') {
          return (
            <div key={i} className="flex gap-2.5 items-start pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0 mt-[7px]" />
              <span className="text-sm text-foreground leading-relaxed">{b.text}</span>
            </div>
          );
        }
        if (b.kind === 'note') {
          return (
            <div key={i} className="mt-2 flex gap-2 items-start pl-1 py-2 border-l-2 border-amber-400/60 bg-amber-50/50 dark:bg-amber-900/10 px-3">
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  {b.label}:{' '}
                </span>
                <span className="text-xs text-foreground/80 leading-relaxed">{b.text}</span>
              </div>
            </div>
          );
        }
        return null;
      })}
    </li>
  );
}

// ── Section component ─────────────────────────────────────────────────────────

function Section({
  title, icon: Icon, expanded, onToggle, children,
}: {
  title: string; icon: React.ElementType;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-border bg-background hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-bold text-foreground">{title}</span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SchemeDetails({ scheme }: { scheme: Scheme }) {
  const {
    saveScheme, removeSavedScheme, savedSchemes,
    getSchemeDetailBySlug, getSchemeDocuments, getSchemeFaqs, getSchemeApplicationProcess,
  } = useSchemes();
  const { userProfile, existingProfile, userId } = useMsmeAuth();

  const [saveAnim, setSaveAnim] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    description: true, eligibility: true, benefits: true,
    documents: true, process: true, faqs: false, references: false,
  });
  const [detailLoading, setDetailLoading]   = useState(false);
  const [schemeDetail, setSchemeDetail]     = useState<any>(null);
  const [documents, setDocuments]           = useState<string[]>([]);
  const [faqs, setFaqs]                     = useState<any[]>([]);
  const [applicationProcess, setApplicationProcess] = useState<string | null>(null);
  const [detailFetched, setDetailFetched]   = useState(false);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [isApplied, setIsApplied]           = useState(false);

  const isSaved = savedSchemes.some((s) => s.id === scheme.id);

  // Check existing application
  useEffect(() => {
    if (localStorage.getItem(`applied_scheme_${scheme.id}`) === 'true') {
      setIsApplied(true);
    }
    const check = async () => {
      try {
        const msmeUserId = userId ? parseInt(userId) : null;
        if (!msmeUserId) return;
        const res = await casesApi.getMsmeCases(msmeUserId);
        if (res.success && res.cases?.find((c: any) => c.schemeId === scheme.id)) {
          setIsApplied(true);
          localStorage.setItem(`applied_scheme_${scheme.id}`, 'true');
        }
      } catch {}
    };
    check();
  }, [scheme.id, userId]);

  // Fetch scheme details
  useEffect(() => {
    if (!scheme.slug || detailFetched) return;
    setDetailFetched(true);
    setDetailLoading(true);
    (async () => {
      try {
        const detail = await getSchemeDetailBySlug(scheme.slug);
        if (detail?._id) {
          setSchemeDetail(detail);
          const [docs, faqData, appProcess] = await Promise.all([
            getSchemeDocuments(detail._id),
            getSchemeFaqs(detail._id),
            getSchemeApplicationProcess(detail._id),
          ]);
          setDocuments(docs);
          setFaqs(faqData);
          setApplicationProcess(appProcess);
        }
      } catch (err) {
        console.error('Error fetching scheme details:', err);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [scheme.slug, detailFetched]);

  const handleSave = () => {
    setSaveAnim(true);
    setTimeout(() => setSaveAnim(false), 500);
    if (isSaved) { removeSavedScheme(scheme.id); toast.success('Scheme removed from saved'); }
    else { saveScheme([scheme]); toast.success('Scheme saved!'); }
  };

  const handleApply = async () => {
    if (!userId && !existingProfile && !userProfile) {
      toast.error('Please login to apply for this scheme');
      return;
    }
    const msmeUserId = userId ? parseInt(userId) : null;
    if (!msmeUserId) { toast.error('Invalid user information. Please login again.'); return; }

    setIsCreatingCase(true);
    try {
      const businessName =
        existingProfile?.legalNameOfBusiness ||
        existingProfile?.tradeNameOfBusiness ||
        userProfile?.name || 'Unknown Business';

      const res = await casesApi.createCase({
        msmeUserId,
        schemeId: scheme.id,
        schemeName: scheme.schemeName,
        applicationData: { businessName, description: scheme.briefDescription, existingProfile },
      });

      if (res.success || res.case) {
        setIsApplied(true);
        localStorage.setItem(`applied_scheme_${scheme.id}`, 'true');
        toast.success('Application received! An agent will be assigned within 24 hours.', { duration: 5000 });
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    } catch {
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsCreatingCase(false);
    }
  };

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // Derived content
  const basicDetails  = schemeDetail?.en?.basicDetails || schemeDetail?.en || {};
  const schemeContent = schemeDetail?.en?.schemeContent || schemeDetail?.schemeContent || {};
  const officialUrl: string =
    basicDetails?.schemeUrl || basicDetails?.officialWebsite || basicDetails?.websiteUrl ||
    schemeContent?.references?.[0]?.url || '';
  const benefitsBlocks   = parseMarkdownBlocks(schemeContent?.benefits_md || schemeContent?.benefits || '');
  const eligibilityList  = basicDetails?.eligibility || [];
  const exclusionsBlocks = parseMarkdownBlocks(schemeContent?.exclusions_md || schemeContent?.exclusions || '');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ─── Page header ────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>

        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1">
          Government Scheme
        </p>

        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-snug">
              {decodeHtml(scheme.schemeName)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{decodeHtml(scheme.nodalMinistryName)}</p>

            {/* Badges row */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {scheme.schemeLevel && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {scheme.schemeLevel}
                </span>
              )}
              {scheme.schemeCategory?.slice(0, 2).map((cat) => (
                <span key={cat} className="text-[10px] font-extrabold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {cat}
                </span>
              ))}
              {scheme.schemeFor && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {scheme.schemeFor}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md border transition-all ${
                isSaved
                  ? 'border-primary/40 text-primary bg-primary/5 hover:bg-primary/10'
                  : 'border-border text-muted-foreground bg-muted/30 hover:text-foreground hover:border-border/80'
              }`}
            >
              <span className={saveAnim ? 'animate-bookmark-pop' : ''} style={{ display: 'inline-flex' }}>
                {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
              </span>
              {isSaved ? 'Saved' : 'Save'}
            </button>
            {officialUrl && (
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md border border-border text-muted-foreground bg-muted/30 hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Official Site
              </a>
            )}
            <button
              onClick={handleApply}
              disabled={isCreatingCase || isApplied}
              className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-md transition-colors ${
                isApplied
                  ? 'border border-green-400/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 cursor-default'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60'
              }`}
            >
              {isApplied ? (
                <><Check className="h-3.5 w-3.5" />Applied</>
              ) : isCreatingCase ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Submitting…</>
              ) : (
                <>Apply Now</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Two-column layout ───────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">

        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Overview */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-background">
              <h3 className="text-[13px] font-bold text-foreground">Overview</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-foreground leading-relaxed">{decodeHtml(scheme.briefDescription)}</p>
              {scheme.tags?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-1.5">
                  {scheme.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Why you're eligible */}
          {scheme.matchReason && (
            <div className="bg-primary/5 border border-primary/20 rounded-none overflow-hidden">
              <div className="px-5 py-3.5 border-b border-primary/20">
                <h3 className="text-[13px] font-bold text-primary flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Why you&apos;re eligible
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Based on your business profile</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-foreground leading-relaxed">{decodeHtml(scheme.matchReason)}</p>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {detailLoading && (
            <div className="bg-card border border-border rounded-none px-5 py-6 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span className="text-sm">Loading detailed information…</span>
            </div>
          )}

          {/* Detailed description */}
          {schemeContent?.detailedDescription_md && (
            <Section title="Detailed Description" icon={FileText}
              expanded={expanded.description} onToggle={() => toggle('description')}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line border-l-2 border-primary/30 pl-4">
                {cleanMarkdown(schemeContent.detailedDescription_md)}
              </p>
            </Section>
          )}

          {/* Eligibility */}
          {eligibilityList.length > 0 && (
            <Section title="Eligibility Criteria" icon={Shield}
              expanded={expanded.eligibility} onToggle={() => toggle('eligibility')}>
              <ul className="space-y-3">
                {eligibilityList.map((criterion: string, idx: number) => (
                  <EligibilityItem key={idx} criterion={criterion} />
                ))}
              </ul>
            </Section>
          )}

          {/* Benefits */}
          {benefitsBlocks.length > 0 && (
            <Section title="Key Benefits" icon={Star}
              expanded={expanded.benefits} onToggle={() => toggle('benefits')}>
              <div className="space-y-2.5">
                {benefitsBlocks.map((block, idx) =>
                  block.type === 'heading' ? (
                    <p key={idx} className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mt-4 mb-1 first:mt-0">
                      {block.text}
                    </p>
                  ) : (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="text-primary font-bold text-base leading-none mt-0.5">·</span>
                      <span className="text-sm text-foreground leading-relaxed">{block.text}</span>
                    </div>
                  )
                )}
              </div>
            </Section>
          )}

          {/* Documents Required */}
          {documents.length > 0 && (
            <Section title="Documents Required" icon={FileText}
              expanded={expanded.documents} onToggle={() => toggle('documents')}>
              <ul className="space-y-2">
                {documents.map((doc: string, idx: number) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="text-primary font-bold text-base leading-none mt-0.5">·</span>
                    <span className="text-sm text-foreground">{decodeHtml(doc)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Application Process */}
          {applicationProcess && (
            <Section title="Application Process" icon={ListOrdered}
              expanded={expanded.process} onToggle={() => toggle('process')}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line border-l-2 border-primary/30 pl-4">
                {typeof applicationProcess === 'string'
                  ? cleanMarkdown(applicationProcess)
                  : JSON.stringify(applicationProcess, null, 2)}
              </p>
            </Section>
          )}

          {/* Exclusions */}
          {exclusionsBlocks.length > 0 && (
            <Section title="Exclusions" icon={Shield}
              expanded={expanded.exclusions ?? false} onToggle={() => toggle('exclusions')}>
              <div className="space-y-2.5">
                {exclusionsBlocks.map((block, idx) =>
                  block.type === 'heading' ? (
                    <p key={idx} className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mt-4 mb-1 first:mt-0">
                      {block.text}
                    </p>
                  ) : (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="text-destructive font-bold text-base leading-none mt-0.5">·</span>
                      <span className="text-sm text-foreground leading-relaxed">{block.text}</span>
                    </div>
                  )
                )}
              </div>
            </Section>
          )}

          {/* FAQs */}
          {faqs.length > 0 && (
            <Section title="Frequently Asked Questions" icon={HelpCircle}
              expanded={expanded.faqs} onToggle={() => toggle('faqs')}>
              <div className="space-y-4">
                {faqs.map((faq: any, idx: number) => (
                  <div key={idx} className="pb-4 border-b border-border last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-foreground mb-1.5">{cleanMarkdown(faq.question)}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{cleanMarkdown(faq.answer)}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* References */}
          {schemeContent?.references?.length > 0 && (
            <Section title="Sources & References" icon={Link2}
              expanded={expanded.references} onToggle={() => toggle('references')}>
              <div className="space-y-1.5">
                {schemeContent.references.map((ref: any, idx: number) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {decodeHtml(ref.title || '')}
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4 lg:sticky lg:top-24">

          {/* Apply card */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-background">
              <h3 className="text-[13px] font-bold text-foreground">Quick Actions</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <button
                onClick={handleApply}
                disabled={isCreatingCase || isApplied}
                className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-md transition-colors ${
                  isApplied
                    ? 'border border-green-400/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 cursor-default'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60'
                }`}
              >
                {isApplied ? (
                  <><Check className="h-4 w-4" />Applied</>
                ) : isCreatingCase ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
                ) : (
                  <>Apply Now</>
                )}
              </button>
              <button
                onClick={handleSave}
                className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-md border transition-all ${
                  isSaved
                    ? 'border-primary/40 text-primary bg-primary/5 hover:bg-primary/10'
                    : 'border-border text-foreground bg-muted/20 hover:bg-muted/50'
                }`}
              >
                <span className={saveAnim ? 'animate-bookmark-pop' : ''} style={{ display: 'inline-flex' }}>
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </span>
                {isSaved ? 'Saved' : 'Save Scheme'}
              </button>
              {officialUrl && (
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-md border border-border text-muted-foreground bg-muted/10 hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Official Website
                </a>
              )}
            </div>

            {/* Support blurb */}
            <div className="mx-5 mb-4 p-4 bg-primary/5 border border-primary/20 rounded-md">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Need help applying?</p>
              <p className="text-sm font-medium text-foreground">Our agents guide you through the process end-to-end.</p>
            </div>
          </div>

          {/* Scheme meta */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-background">
              <h3 className="text-[13px] font-bold text-foreground">Scheme Info</h3>
            </div>
            <div className="px-5 py-2">
              {[
                { label: 'Ministry',    value: scheme.nodalMinistryName },
                { label: 'Level',       value: scheme.schemeLevel },
                { label: 'Category',    value: scheme.schemeCategory?.[0] },
                { label: 'Scheme For',  value: scheme.schemeFor },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label} className="flex items-start gap-4 py-2.5 border-b border-border last:border-0">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] w-24 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-foreground">{decodeHtml(value)}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Tags */}
          {scheme.tags?.length > 0 && (
            <div className="bg-card border border-border rounded-none overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-background">
                <h3 className="text-[13px] font-bold text-foreground">Tags</h3>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-1.5">
                {scheme.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

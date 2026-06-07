// Eligibility report → a natively-drawn, designed A4 PDF (jsPDF vector).
//
// This is NOT an HTML screenshot. Every element — the hero band, the profile
// panel, each scheme card, the running header and footer — is laid out and
// drawn with jsPDF primitives so the text is crisp + selectable, the file is
// small, and pagination is clean (a scheme card never splits across a page).
//
// Privacy: deliberately omits sensitive identifiers (PAN, GSTIN, phone, email).
// Only non-sensitive descriptive fields are shown.
//
// jsPDF is browser-only and loaded dynamically so this module is SSR-safe.

export interface ReportUser {
  name?: string | null;
}

export interface ReportBusiness {
  legalName?: string | null;
  sector?: string | null;
  state?: string | null;
  type?: string | null;
  enterpriseCategory?: string | null;
}

export interface ReportScheme {
  name: string;
  ministry?: string | null;
  level?: string | null;
  category?: string | null;
  confidence?: string | null;
  briefDescription?: string | null;
  whyEligible: string[];
  benefits?: string | null;
  notes?: string | null;
}

export interface ReportData {
  user: ReportUser;
  business: ReportBusiness;
  schemes: ReportScheme[];
}

// ── Brand palette (mirrors app/globals.css light tokens) ────────────────────
const C = {
  primary: '#4f46e5',
  primaryDark: '#312e81',
  ink: '#0f1b2d',
  body: '#33425a',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f6',
  lineSoft: '#eef2fb',
  panel: '#f6f8ff',
  emerald: '#059669',
  emeraldSoft: '#ecfdf5',
  emeraldLine: '#a7f3d0',
  amber: '#b45309',
  amberLine: '#fcd34d',
  white: '#ffffff',
};

const SECTOR_LABEL: Record<string, string> = {
  finance: 'Finance & Professional Services', technology: 'IT / Software / Technology',
  manufacturing: 'Manufacturing', retail: 'Retail / Trading', services: 'Services',
  healthcare: 'Healthcare & Pharma', education: 'Education & Training',
  construction: 'Construction & Real Estate', transport: 'Transport & Logistics',
  agro: 'Agriculture & Food Processing', textile: 'Textile & Apparel',
  handicraft: 'Handicraft & Artisan', fisheries: 'Fisheries & Aquaculture',
  ecommerce: 'E-Commerce', energy: 'Energy & Renewables',
  hospitality: 'Hospitality & Tourism', media: 'Media & Entertainment',
};

function pretty(v?: string | null): string {
  if (!v) return '—';
  return SECTOR_LABEL[v] || v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Decode the HTML entities the engine text commonly carries. &amp; first so a
// double-encoded "&amp;gt;" resolves all the way to ">".
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

// ROOT-CAUSE FIX for "letters/words have big gaps" + text not wrapping:
// scraped/LLM text is full of Unicode whitespace — non-breaking space (U+00A0),
// narrow/thin/hair spaces, zero-width chars, etc. jsPDF renders these as visible
// gaps and (worse) never wraps on them, so a phrase becomes one unbreakable
// "word" that overflows the cell. Normalise every such char to a plain space
// (or drop it), and swap the rupee sign which isn't in jsPDF's WinAnsi font.
function sanitizeText(s: string): string {
  return s
    // every Unicode space variant (NBSP, narrow/thin/hair/figure, ideographic) -> plain space
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    // zero-width / joiners / BOM -> remove
    .replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, "")
    // control characters -> remove
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // rupee sign (absent from WinAnsi font) -> Rs.
    .replace(/\u20B9/g, "Rs.")
    // smart quotes -> straight quotes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // dashes -> hyphen; ellipsis -> ...
    .replace(/[\u2012\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    // ARROWS (engine writes criteria as 'clause -> satisfied by fact' with U+2192 etc.)
    // -> spaced ASCII arrow so the glyph renders AND the line can wrap. 'Why you qualify' fix.
    .replace(/[\u2190-\u21FF\u2794-\u27BF\u27F0-\u27FF\u2900-\u297F]/g, " -> ")
    // odd bullets / check marks -> dash / removed
    .replace(/[\u2022\u2023\u25CF\u25AA\u2043\u2219]/g, "-")
    .replace(/[\u2713\u2714\u2717\u2718\u2705\u274C\u2611]/g, "")
    // anything STILL outside Latin-1 cannot render in WinAnsi -> drop it
    .replace(/[^\u0000-\u00FF]/g, "");
}

// Clean a plain field (names, ministry, tags) — no markdown stripping.
function clean(text?: string | null): string {
  if (!text) return '';
  return sanitizeText(decodeEntities(String(text))).replace(/[ \t]{2,}/g, ' ').trim();
}

function stripMd(text?: string | null): string {
  if (!text) return '';
  return sanitizeText(decodeEntities(String(text)))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, '')        // drop any stray HTML tags
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/`+/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/logos/white-logo.png';
  });
}

// ── Internal builder — returns the completed jsPDF instance ─────────────────
async function buildPdf(data: ReportData): Promise<any> {
  const { default: jsPDF } = await import('jspdf');
  const logo = await loadLogo();

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const PW = pdf.internal.pageSize.getWidth();   // ~595.28
  const PH = pdf.internal.pageSize.getHeight();  // ~841.89
  const M = 42;                                  // page margin
  const CW = PW - M * 2;                          // content width
  const FOOTER_TOP = PH - 44;

  // ── low-level helpers ─────────────────────────────────────────────────────
  const fill = (hex: string) => pdf.setFillColor(...rgb(hex));
  const stroke = (hex: string) => pdf.setDrawColor(...rgb(hex));
  const ink = (hex: string) => pdf.setTextColor(...rgb(hex));
  const font = (style: 'normal' | 'bold' | 'italic', size: number) => { pdf.setFont('helvetica', style); pdf.setFontSize(size); };

  const wrap = (text: string, maxW: number): string[] => pdf.splitTextToSize(text, maxW);

  const matchLabel = (conf?: string | null) => {
    const c = (conf || '').toLowerCase();
    if (c === 'high') return 'Strong match';
    if (c === 'medium') return 'Good match';
    return '';
  };

  // ── page chrome ───────────────────────────────────────────────────────────
  const drawRunningHeader = () => {
    fill(C.white); pdf.rect(0, 0, PW, 50, 'F');
    fill(C.primary); pdf.rect(0, 0, 4, 50, 'F');
    ink(C.primary); font('bold', 11);
    pdf.text('Scheme Eligibility Report', M, 30);
    ink(C.faint); font('normal', 8.5);
    pdf.text('Cred2Tech', PW - M, 30, { align: 'right' });
    stroke(C.line); pdf.setLineWidth(0.6); pdf.line(M, 44, PW - M, 44);
  };

  // ── hero (page 1) ─────────────────────────────────────────────────────────
  const generatedAt = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
  const HERO_H = 132;
  fill(C.primaryDark); pdf.rect(0, 0, PW, HERO_H, 'F');
  fill(C.primary); pdf.rect(0, 0, PW, HERO_H - 4, 'F');
  // emerald accent seam
  fill(C.emerald); pdf.rect(0, HERO_H - 4, PW, 4, 'F');

  if (logo) {
    const lw = 116; const lh2 = (logo.height / logo.width) * lw;
    pdf.addImage(logo, 'PNG', M, 26, lw, Math.min(lh2, 34));
  }
  ink(C.white); font('bold', 22);
  pdf.text('Scheme Eligibility Report', M, 92);
  ink('#dbe2ff'); font('normal', 10.5);
  pdf.text('AI-matched government schemes for your business', M, 110);

  // right meta block
  ink('#c7d2fe'); font('normal', 8.5);
  pdf.text('GENERATED', PW - M, 40, { align: 'right' });
  ink(C.white); font('bold', 10);
  pdf.text(generatedAt, PW - M, 54, { align: 'right' });
  const countTxt = `${data.schemes.length} eligible ${data.schemes.length === 1 ? 'scheme' : 'schemes'}`;
  font('bold', 9.5);
  const ctw = pdf.getTextWidth(countTxt) + 20;
  fill('#6366f1'); pdf.roundedRect(PW - M - ctw, 70, ctw, 20, 10, 10, 'F');
  ink(C.white); pdf.text(countTxt, PW - M - ctw / 2, 83.5, { align: 'center' });

  let y = HERO_H + 26;

  // ── profile panel ─────────────────────────────────────────────────────────
  const fields: { label: string; value: string }[] = [
    { label: 'Business', value: data.business.legalName || data.user.name || '—' },
    { label: 'Prepared for', value: data.user.name || '—' },
    { label: 'Industry / Sector', value: pretty(data.business.sector) },
    { label: 'State', value: pretty(data.business.state) },
    { label: 'Business Type', value: pretty(data.business.type) },
    { label: 'MSME Category', value: pretty(data.business.enterpriseCategory) },
  ];
  const PCOLS = 3;
  const prows = Math.ceil(fields.length / PCOLS);
  const panelPadX = 18, panelPadTop = 30, panelRowH = 34, panelPadBot = 14;
  const panelH = panelPadTop + prows * panelRowH + panelPadBot;
  const fieldW = (CW - panelPadX * 2) / PCOLS;

  fill(C.panel); stroke(C.line); pdf.setLineWidth(0.8);
  pdf.roundedRect(M, y, CW, panelH, 10, 10, 'FD');
  ink(C.primary); font('bold', 9);
  pdf.text('BUSINESS PROFILE', M + panelPadX, y + 19);
  stroke(C.line); pdf.line(M + panelPadX, y + 25, M + CW - panelPadX, y + 25);

  fields.forEach((f, i) => {
    const r = Math.floor(i / PCOLS), c = i % PCOLS;
    const fx = M + panelPadX + c * fieldW;
    const fy = y + panelPadTop + r * panelRowH;
    ink(C.faint); font('bold', 7.5);
    pdf.text(f.label.toUpperCase(), fx, fy + 6);
    ink(C.ink); font('normal', 10.5);
    const v = wrap(f.value, fieldW - 8)[0] || f.value;
    pdf.text(v, fx, fy + 20);
  });

  y += panelH + 26;

  // ── section heading ───────────────────────────────────────────────────────
  fill(C.primary); pdf.rect(M, y - 1, 22, 3, 'F');
  ink(C.ink); font('bold', 13);
  pdf.text('Eligible Schemes', M, y + 13);
  ink(C.muted); font('normal', 9.5);
  pdf.text(`${data.schemes.length} total`, PW - M, y + 13, { align: 'right' });
  y += 30;

  // ── one detail table per scheme ───────────────────────────────────────────
  // Each scheme gets its OWN labelled table (all of its information), drawn by
  // jspdf-autotable so wrapping / row heights / page breaks are always correct.
  const { default: autoTable } = await import('jspdf-autotable');

  const LABEL_W = 104;
  const labelCell = (t: string) => ({
    content: t,
    styles: {
      fontStyle: 'bold' as const, textColor: rgb(C.muted), fillColor: rgb(C.panel),
      cellWidth: LABEL_W, valign: 'top' as const,
    },
  });
  const valueCell = (t: string, extra: Record<string, any> = {}) => ({
    content: t || '—',
    styles: { textColor: rgb(C.body), ...extra },
  });

  const drawnHeaderPages = new Set<number>();
  let startY = y;

  data.schemes.forEach((s, i) => {
    const ml = matchLabel(s.confidence);
    const ministry = clean(s.ministry);
    const tags = [clean(s.level), clean(s.category)].filter(Boolean).join('   ·   ');
    const desc = stripMd(s.briefDescription);
    const why = (s.whyEligible || []).map(stripMd).filter(Boolean);
    const whyText = why.map((w) => `•  ${w}`).join('\n');
    const benefits = stripMd(s.benefits);
    const note = stripMd(s.notes);

    // Title bar = colSpan-2 head row carrying the numbered scheme name.
    const head = [[{
      content: `${i + 1}.   ${clean(s.name)}`,
      colSpan: 2,
      styles: {
        fillColor: rgb(C.primary), textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold' as const, fontSize: 11, halign: 'left' as const,
        cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
      },
    }]];

    const rows: any[] = [];
    if (ministry) rows.push([labelCell('Ministry'), valueCell(ministry)]);
    if (tags) rows.push([labelCell('Type'), valueCell(tags)]);
    if (ml) rows.push([labelCell('Match strength'), valueCell(ml, { textColor: rgb(C.emerald), fontStyle: 'bold' })]);
    if (desc) rows.push([labelCell('About'), valueCell(desc)]);
    if (whyText) rows.push([labelCell('Why you qualify'), valueCell(whyText, { textColor: rgb(C.ink) })]);
    if (benefits) rows.push([labelCell('Benefits'), valueCell(benefits)]);
    if (note) rows.push([labelCell('Note'), valueCell(note, { textColor: rgb(C.amber), fontStyle: 'italic' })]);
    if (rows.length === 0) rows.push([labelCell('Details'), valueCell('—')]);

    autoTable(pdf, {
      startY,
      tableWidth: CW,              // pin the table to the content width…
      margin: { top: 64, bottom: 52, left: M, right: M },
      head,
      body: rows,
      theme: 'grid',
      pageBreak: 'avoid',          // keep a scheme together unless it's taller than a page
      rowPageBreak: 'avoid',       // never split a single field row
      styles: {
        font: 'helvetica', fontSize: 9, cellPadding: { top: 6, right: 10, bottom: 6, left: 10 },
        textColor: rgb(C.body), lineColor: rgb(C.line), lineWidth: 0.5,
        valign: 'top', overflow: 'linebreak',
      },
      // …and FIX both column widths so long text always wraps inside the value
      // cell instead of overflowing off the page ('auto' lets it run wide).
      columnStyles: { 0: { cellWidth: LABEL_W }, 1: { cellWidth: CW - LABEL_W } },
      didDrawPage: () => {
        const pageNo = (pdf as any).internal.getCurrentPageInfo().pageNumber;
        if (pageNo > 1 && !drawnHeaderPages.has(pageNo)) { drawRunningHeader(); drawnHeaderPages.add(pageNo); }
      },
    });

    startY = (pdf as any).lastAutoTable.finalY + 16; // gap before the next scheme
  });

  // ── footer on every page (drawn after the table so page count is final) ────
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    stroke(C.line); pdf.setLineWidth(0.6); pdf.line(M, FOOTER_TOP, PW - M, FOOTER_TOP);
    ink(C.faint); font('normal', 7.5);
    pdf.text('Cred2Tech · Informational only — verify final eligibility on the official scheme portal before applying.', M, FOOTER_TOP + 14);
    pdf.text(`Page ${p} of ${pages}`, PW - M, FOOTER_TOP + 14, { align: 'right' });
  }

  return pdf;
}

function safeName(data: ReportData): string {
  return (data.business.legalName || data.user.name || 'business')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'report';
}

/**
 * Generate and download the designed eligibility PDF. Resolves once saved;
 * throws on hard failures so the caller can surface a toast.
 */
export async function generateEligibilityReport(data: ReportData): Promise<void> {
  if (typeof window === 'undefined') throw new Error('PDF generation must run in the browser');
  if (!data.schemes.length) throw new Error('No eligible schemes to include in the report');
  const pdf = await buildPdf(data);
  pdf.save(`Cred2Tech-Eligibility-${safeName(data)}.pdf`);
}

/**
 * Generate the designed eligibility PDF and return its raw bytes.
 * Use this to attach the PDF to an email or upload it instead of auto-saving.
 */
export async function generateEligibilityReportBytes(data: ReportData): Promise<Uint8Array> {
  if (typeof window === 'undefined') throw new Error('PDF generation must run in the browser');
  if (!data.schemes.length) throw new Error('No eligible schemes to include in the report');
  const pdf = await buildPdf(data);
  return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer);
}

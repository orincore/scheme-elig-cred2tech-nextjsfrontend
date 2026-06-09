'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminAuthApi } from '@/lib/services/api';
import {
  FileText, Plus, Search, RefreshCw, Trash2, Pencil, Save, X, ChevronLeft, ChevronRight, AlertTriangle, Eye, ExternalLink,
} from 'lucide-react';

interface SchemeRow {
  _id: string; slug: string; schemeName: string; schemeShortTitle?: string;
  level?: string; state?: string; source?: string; nodalMinistryName?: string;
  schemeCategory?: string[]; displayCategory?: string | null; benefitTypes?: string;
}
interface Category { _id: string; key: string; label: string; }

const SOURCES = ['', 'myscheme', 'emsme', 'curated'];

function Section({ title, icon: Icon, action, children }: { title: React.ReactNode; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{title}</h3>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// Read-only labelled value for the details view. Hides empty values.
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">{value}</div>
    </div>
  );
}

const yesNo = (v: any) => (v === true ? 'Yes' : v === false ? 'No' : '—');

// Scheme text fields hold a mix of markdown bold (**label**) and raw HTML
// (<p>, <br>, <li>, &nbsp; …). Normalize to clean text with paragraph breaks,
// then render markdown bold — no dangerouslySetInnerHTML, no extra deps.
function htmlToText(raw: string): string {
  return String(raw)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(li|ul|ol|div|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')            // strip any remaining tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderInlineBold(text: string, keyBase: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part)
      ? <strong key={`${keyBase}-${i}`} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      : <span key={`${keyBase}-${i}`}>{part}</span>,
  );
}

function RichText({ text }: { text?: string | null }) {
  const clean = text ? htmlToText(text) : '';
  if (!clean) return null;
  return (
    <div className="text-sm text-foreground space-y-1.5">
      {clean.split('\n').map((line, i) =>
        line.trim() === ''
          ? null
          : <p key={i} className="leading-relaxed whitespace-pre-wrap break-words">{renderInlineBold(line, String(i))}</p>,
      )}
    </div>
  );
}

// Metadata fields editable for an existing scheme (mirrors engine whitelist).
const META_FIELDS: { k: string; label: string; area?: boolean }[] = [
  { k: 'schemeName', label: 'Scheme name' },
  { k: 'schemeShortTitle', label: 'Short title' },
  { k: 'nodalMinistryName', label: 'Nodal ministry' },
  { k: 'implementingAgency', label: 'Implementing agency' },
  { k: 'benefitTypes', label: 'Benefit type (Cash/In Kind/Composite)' },
  { k: 'schemeUrl', label: 'Scheme URL' },
  { k: 'briefDescription', label: 'Brief description', area: true },
  { k: 'benefits', label: 'Benefits', area: true },
  { k: 'detailedDescription', label: 'Detailed description', area: true },
  { k: 'documentsRequired', label: 'Documents required', area: true },
];

export default function AdminSchemesPage() {
  const [rows, setRows] = useState<SchemeRow[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // editor state
  const [mode, setMode] = useState<'none' | 'create' | 'edit' | 'view'>('none');
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await adminAuthApi.listAdminSchemes({ search, source, category, page: p, limit: 20 });
      if (res?.success) { setRows(res.schemes || []); setTotal(res.total || 0); setTotalPages(res.totalPages || 1); setPage(res.page || p); }
      setError(null);
    } catch (e: any) { setError(e?.message || 'Failed to load schemes'); }
    finally { setLoading(false); }
  }, [search, source, category, page]);

  useEffect(() => { (async () => {
    try { const c = await adminAuthApi.listCategories(); if (c?.success) setCats(c.categories || []); } catch {}
    await load(1);
  })(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const catLabel = (key?: string | null) => key ? (cats.find((c) => c.key === key)?.label || key) : '—';

  // Quick inline category assignment (metadata-only PATCH).
  const assignCategory = async (id: string, displayCategory: string) => {
    try {
      await adminAuthApi.updateScheme(id, { displayCategory: displayCategory || null });
      setRows((rs) => rs.map((r) => r._id === id ? { ...r, displayCategory: displayCategory || null } : r));
    } catch (e: any) { setError(e?.message || 'Assign failed'); }
  };

  const openCreate = () => { setMode('create'); setForm({ level: 'Central', schemeFor: 'Business', eligibility: {} }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const fetchInto = async (id: string, nextMode: 'edit' | 'view') => {
    setBusy(true);
    try {
      const res = await adminAuthApi.getAdminScheme(id);
      if (res?.success) { setForm(res.scheme); setMode(nextMode); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else setError(res?.error || 'Failed to load scheme');
    } catch (e: any) { setError(e?.message || 'Failed to load scheme'); }
    finally { setBusy(false); }
  };
  const openEdit = (id: string) => fetchInto(id, 'edit');
  const openView = (id: string) => fetchInto(id, 'view');

  const save = async () => {
    setBusy(true); setError(null);
    try {
      if (mode === 'create') {
        if (!form.schemeName?.trim()) { setError('Scheme name is required'); setBusy(false); return; }
        const res = await adminAuthApi.createScheme({
          ...form,
          tags: typeof form.tags === 'string' ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : form.tags,
        });
        if (!res?.success) { setError(res?.error || 'Create failed'); setBusy(false); return; }
      } else {
        // metadata only
        const body: any = {};
        for (const { k } of META_FIELDS) if (k in form) body[k] = form[k];
        body.displayCategory = form.displayCategory || null;
        if (typeof form.tags === 'string') body.tags = form.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        const res = await adminAuthApi.updateScheme(form._id, body);
        if (!res?.success) { setError(res?.error || 'Update failed'); setBusy(false); return; }
      }
      setMode('none'); setForm({}); await load(mode === 'create' ? 1 : page);
    } catch (e: any) { setError(e?.message || 'Save failed'); }
    finally { setBusy(false); }
  };

  const remove = async (r: SchemeRow) => {
    if (!window.confirm(`Delete "${r.schemeName}"? This removes it from the database and the AI engine. This cannot be undone.`)) return;
    try { await adminAuthApi.deleteScheme(r._id); await load(page); }
    catch (e: any) { setError(e?.message || 'Delete failed'); }
  };

  const f = (k: string) => form[k] ?? '';
  const setF = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));
  const setElig = (k: string, v: any) => setForm((s: any) => ({ ...s, eligibility: { ...(s.eligibility || {}), [k]: v } }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><FileText className="h-5 w-5" /> Schemes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Search, add, edit (metadata) or delete schemes, and assign display categories.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(page)} className="rounded-none"><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
          <Button size="sm" onClick={openCreate} className="rounded-none"><Plus className="h-4 w-4 mr-1.5" /> Add Scheme</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2.5 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Read-only full details */}
      {mode === 'view' && (
        <Section
          title={`Scheme details: ${form.schemeName || ''}`}
          icon={Eye}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setMode('edit'); }} className="rounded-none"><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setMode('none'); setForm({}); }} className="rounded-none"><X className="h-3.5 w-3.5 mr-1" /> Close</Button>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Identity + badges */}
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-foreground">{form.schemeName}</h2>
              {form.schemeShortTitle && <p className="text-sm text-muted-foreground">{form.schemeShortTitle}</p>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] px-2 py-0.5 bg-muted rounded-none">source: {form.source || 'myscheme'}</span>
                {form.level && <span className="text-[11px] px-2 py-0.5 bg-muted rounded-none">{form.level}{form.state ? ` · ${form.state}` : ''}</span>}
                {form.schemeFor && <span className="text-[11px] px-2 py-0.5 bg-muted rounded-none">{form.schemeFor}</span>}
                {form.benefitTypes && <span className="text-[11px] px-2 py-0.5 bg-muted rounded-none">{form.benefitTypes}</span>}
                {form.displayCategory && <span className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-none">category: {catLabel(form.displayCategory)}</span>}
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
              <Field label="Slug" value={form.slug} />
              <Field label="Nodal ministry" value={form.nodalMinistryName} />
              <Field label="Implementing agency" value={form.implementingAgency} />
              <Field label="Scheme category (AI)" value={(form.schemeCategory || []).join(', ')} />
              <Field label="Sub-category" value={(form.schemeSubCategory || []).join(', ')} />
              <Field label="Tags" value={(form.tags || []).join(', ')} />
              <Field label="Scheme URL" value={form.schemeUrl
                ? <a href={form.schemeUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline break-all">{form.schemeUrl}<ExternalLink className="h-3 w-3 shrink-0" /></a>
                : null} />
            </div>

            {/* Content */}
            <div className="space-y-4 border-t border-border pt-4">
              <Field label="Brief description" value={form.briefDescription ? <RichText text={form.briefDescription} /> : null} />
              <Field label="Benefits" value={form.benefits ? <RichText text={form.benefits} /> : null} />
              <Field label="Detailed description" value={form.detailedDescription ? <RichText text={form.detailedDescription} /> : null} />
              <Field label="Exclusions" value={form.exclusions ? <RichText text={form.exclusions} /> : null} />
              <Field label="Documents required" value={form.documentsRequired ? <RichText text={form.documentsRequired} /> : null} />
              <Field label="Eligibility (text)" value={form.eligibilityText ? <RichText text={form.eligibilityText} /> : null} />
            </div>

            {/* Structured eligibility */}
            {form.eligibility && (
              <div className="border-t border-border pt-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Eligibility criteria (AI engine)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Gender" value={(form.eligibility.gender || []).join(', ')} />
                  <Field label="Beneficiary state" value={(form.eligibility.beneficiaryState || []).join(', ')} />
                  <Field label="Residence" value={form.eligibility.residence} />
                  <Field label="Caste" value={(form.eligibility.caste || []).join(', ')} />
                  <Field label="Employment status" value={(form.eligibility.employmentStatus || []).join(', ')} />
                  <Field label="Age range" value={(form.eligibility.ageMin || form.eligibility.ageMax) ? `${form.eligibility.ageMin ?? '—'} to ${form.eligibility.ageMax ?? '—'}` : null} />
                  <Field label="Max annual income" value={form.eligibility.annualIncomeMax != null ? `₹${Number(form.eligibility.annualIncomeMax).toLocaleString('en-IN')}` : null} />
                  <Field label="Startup required" value={form.eligibility.isStartup != null ? yesNo(form.eligibility.isStartup) : null} />
                  <Field label="Women-led" value={form.eligibility.isWomenLed != null ? yesNo(form.eligibility.isWomenLed) : null} />
                  <Field label="Export-oriented" value={form.eligibility.isExportOriented != null ? yesNo(form.eligibility.isExportOriented) : null} />
                  <Field label="Udyam required" value={form.eligibility.udyamRequired != null ? yesNo(form.eligibility.udyamRequired) : null} />
                  <Field label="Ex-serviceman" value={form.eligibility.isExServiceman != null ? yesNo(form.eligibility.isExServiceman) : null} />
                </div>
              </div>
            )}

            {/* Application process */}
            {Array.isArray(form.applicationProcess) && form.applicationProcess.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Application process ({(form.applicationMode || []).join(', ') || '—'})</p>
                <div className="space-y-3">
                  {form.applicationProcess.map((ap: any, i: number) => (
                    <div key={i} className="text-sm">
                      <p className="font-medium text-foreground">{ap.mode || 'Process'}</p>
                      {ap.url && <a href={ap.url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline break-all text-xs">{ap.url}<ExternalLink className="h-3 w-3 shrink-0" /></a>}
                      {ap.processText && <div className="text-muted-foreground mt-1"><RichText text={ap.processText} /></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* References */}
            {Array.isArray(form.references) && form.references.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">References</p>
                <ul className="space-y-1">
                  {form.references.map((r: any, i: number) => (
                    <li key={i} className="text-sm">
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline break-all">{r.title || r.url}<ExternalLink className="h-3 w-3 shrink-0" /></a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Editor */}
      {(mode === 'create' || mode === 'edit') && (
        <Section title={mode === 'create' ? 'Add scheme' : `Edit: ${form.schemeName || ''}`} icon={mode === 'create' ? Plus : Pencil}
          action={<span className="text-[11px] text-muted-foreground">{mode === 'edit' ? 'Metadata only — eligibility criteria are managed by the AI engine' : 'New scheme will be AI-usable'}</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {META_FIELDS.map(({ k, label, area }) => (
              <div key={k} className={area ? 'sm:col-span-2' : ''}>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{label}{k === 'schemeName' && ' *'}</label>
                {area
                  ? <textarea className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" rows={2} value={f(k)} onChange={(e) => setF(k, e.target.value)} />
                  : <input className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={f(k)} onChange={(e) => setF(k, e.target.value)} />}
              </div>
            ))}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Display category</label>
              <select className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={form.displayCategory || ''} onChange={(e) => setF('displayCategory', e.target.value)}>
                <option value="">— Auto-classify —</option>
                {cats.map((c) => <option key={c._id} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Tags (comma-separated)</label>
              <input className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags ?? '')} onChange={(e) => setF('tags', e.target.value)} />
            </div>

            {/* Create-only: geography + eligibility so the new scheme is properly AI-usable */}
            {mode === 'create' && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Level</label>
                  <select className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={form.level || 'Central'} onChange={(e) => setF('level', e.target.value)}>
                    <option>Central</option><option>State</option>
                  </select>
                </div>
                {form.level === 'State' && (
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">State</label>
                    <input className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm" value={f('state')} onChange={(e) => setF('state', e.target.value)} />
                  </div>
                )}
                <div className="sm:col-span-2 border-t border-border pt-3 mt-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Eligibility (optional — defaults to open to all)</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {['isStartup', 'isWomenLed', 'isExportOriented', 'udyamRequired'].map((k) => (
                      <label key={k} className="flex items-center gap-1.5">
                        <input type="checkbox" checked={!!(form.eligibility?.[k])} onChange={(e) => setElig(k, e.target.checked || null)} /> {k}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" disabled={busy} onClick={save} className="rounded-none"><Save className="h-4 w-4 mr-1.5" /> {mode === 'create' ? 'Create' : 'Save changes'}</Button>
            <Button size="sm" variant="outline" onClick={() => { setMode('none'); setForm({}); }} className="rounded-none"><X className="h-4 w-4 mr-1.5" /> Cancel</Button>
          </div>
        </Section>
      )}

      {/* Filters */}
      <Section title="Scheme catalogue" icon={FileText} action={<span className="text-xs text-muted-foreground">{total.toLocaleString('en-IN')} total</span>}>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1.5 border border-border bg-background px-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input className="bg-transparent py-2 text-sm flex-1 outline-none" placeholder="Search by name…" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} />
          </div>
          <select className="border border-border bg-background px-3 py-2 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => <option key={s} value={s}>{s ? s : 'All sources'}</option>)}
          </select>
          <select className="border border-border bg-background px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            <option value="__none__">Uncategorized</option>
            {cats.map((c) => <option key={c._id} value={c.key}>{c.label}</option>)}
          </select>
          <Button size="sm" onClick={() => load(1)} className="rounded-none">Apply</Button>
        </div>

        {loading ? <Skeleton className="h-64" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                  <th className="py-2 pr-4">Scheme</th><th className="py-2 pr-4">Source</th><th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">Display category</th><th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-border/50 align-top">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-foreground">{r.schemeName}</div>
                      <div className="text-xs text-muted-foreground">{r.schemeShortTitle || r.slug}</div>
                    </td>
                    <td className="py-2.5 pr-4"><span className="text-xs px-2 py-0.5 bg-muted rounded-none">{r.source || 'myscheme'}</span></td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{r.level}{r.state ? ` · ${r.state}` : ''}</td>
                    <td className="py-2.5 pr-4">
                      <select className="border border-border bg-background px-2 py-1 text-xs max-w-[180px]" value={r.displayCategory || ''} onChange={(e) => assignCategory(r._id, e.target.value)}>
                        <option value="">Auto: {catLabel(r.displayCategory)}</option>
                        {cats.map((c) => <option key={c._id} value={c.key}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => openView(r._id)} className="rounded-none mr-1" title="View details"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(r._id)} className="rounded-none mr-1" title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => remove(r)} className="rounded-none text-red-600 hover:text-red-700" title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No schemes found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)} className="rounded-none"><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => load(page + 1)} className="rounded-none"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Section>
    </div>
  );
}

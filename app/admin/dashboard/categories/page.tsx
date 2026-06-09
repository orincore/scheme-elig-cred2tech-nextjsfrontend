'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminAuthApi } from '@/lib/services/api';
import {
  FolderTree, Plus, RefreshCw, Trash2, Save, X, Pencil, AlertTriangle, Check,
} from 'lucide-react';

interface Category {
  _id: string; key: string; label: string; icon?: string; color?: string;
  order: number; isActive: boolean; schemeCount?: number;
}

const int = (n: any) => (Number(n) || 0).toLocaleString('en-IN');

function Section({ title, icon: Icon, action, children }: { title: React.ReactNode; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />{title}
        </h3>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

const emptyForm = { label: '', key: '', icon: '', color: '', order: 100, isActive: true };

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminAuthApi.listCategories();
      if (res?.success) setCats(res.categories || []);
      setError(null);
    } catch (e: any) { setError(e?.message || 'Failed to load categories'); }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const create = async () => {
    if (!form.label.trim()) { setError('Label is required'); return; }
    setBusy(true); setError(null);
    try {
      const res = await adminAuthApi.createCategory({
        label: form.label.trim(), key: form.key.trim() || undefined,
        icon: form.icon.trim() || undefined, color: form.color.trim() || undefined,
        order: Number(form.order) || 100,
      });
      if (res?.success) { setForm(emptyForm); setCreating(false); await load(); }
      else setError(res?.error || 'Create failed');
    } catch (e: any) { setError(e?.message || 'Create failed'); }
    finally { setBusy(false); }
  };

  const saveEdit = async (id: string) => {
    setBusy(true); setError(null);
    try {
      const res = await adminAuthApi.updateCategory(id, {
        label: editForm.label, key: editForm.key, icon: editForm.icon,
        color: editForm.color, order: Number(editForm.order), isActive: editForm.isActive,
      });
      if (res?.success) { setEditId(null); await load(); }
      else setError(res?.error || 'Update failed');
    } catch (e: any) { setError(e?.message || 'Update failed'); }
    finally { setBusy(false); }
  };

  const toggleActive = async (c: Category) => {
    try { await adminAuthApi.updateCategory(c._id, { isActive: !c.isActive }); await load(); }
    catch (e: any) { setError(e?.message || 'Update failed'); }
  };

  const remove = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.label}"? ${c.schemeCount || 0} scheme(s) using it will revert to auto-classification.`)) return;
    setBusy(true);
    try { await adminAuthApi.deleteCategory(c._id); await load(); }
    catch (e: any) { setError(e?.message || 'Delete failed'); }
    finally { setBusy(false); }
  };

  const startEdit = (c: Category) => {
    setEditId(c._id);
    setEditForm({ label: c.label, key: c.key, icon: c.icon || '', color: c.color || '', order: c.order, isActive: c.isActive });
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-72" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><FolderTree className="h-5 w-5" /> Categories</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Benefit buckets shown on the dashboard. Assign them to schemes from the Schemes page.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="rounded-none"><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
          <Button size="sm" onClick={() => setCreating((v) => !v)} className="rounded-none"><Plus className="h-4 w-4 mr-1.5" /> New Category</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2.5 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {creating && (
        <Section title="New category" icon={Plus}>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input className="border border-border bg-background px-3 py-2 text-sm" placeholder="Label *" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <input className="border border-border bg-background px-3 py-2 text-sm" placeholder="key (auto)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            <input className="border border-border bg-background px-3 py-2 text-sm" placeholder="icon (lucide name)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            <input className="border border-border bg-background px-3 py-2 text-sm" placeholder="color (#hex)" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <input className="border border-border bg-background px-3 py-2 text-sm" type="number" placeholder="order" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" disabled={busy} onClick={create} className="rounded-none"><Save className="h-4 w-4 mr-1.5" /> Create</Button>
            <Button size="sm" variant="outline" onClick={() => { setCreating(false); setForm(emptyForm); }} className="rounded-none"><X className="h-4 w-4 mr-1.5" /> Cancel</Button>
          </div>
        </Section>
      )}

      <Section title={`${cats.length} categories`} icon={FolderTree}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                <th className="py-2 pr-4">Order</th><th className="py-2 pr-4">Label</th><th className="py-2 pr-4">Key</th>
                <th className="py-2 pr-4">Icon</th><th className="py-2 pr-4">Schemes</th><th className="py-2 pr-4">Active</th><th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => editId === c._id ? (
                <tr key={c._id} className="border-b border-border/50 bg-muted/30">
                  <td className="py-2 pr-4"><input className="w-16 border border-border bg-background px-2 py-1 text-sm" type="number" value={editForm.order} onChange={(e) => setEditForm({ ...editForm, order: e.target.value })} /></td>
                  <td className="py-2 pr-4"><input className="border border-border bg-background px-2 py-1 text-sm" value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} /></td>
                  <td className="py-2 pr-4"><input className="w-28 border border-border bg-background px-2 py-1 text-sm" value={editForm.key} onChange={(e) => setEditForm({ ...editForm, key: e.target.value })} /></td>
                  <td className="py-2 pr-4"><input className="w-28 border border-border bg-background px-2 py-1 text-sm" value={editForm.icon} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} /></td>
                  <td className="py-2 pr-4">{int(c.schemeCount)}</td>
                  <td className="py-2 pr-4">{editForm.isActive ? 'Yes' : 'No'}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">
                    <Button size="sm" disabled={busy} onClick={() => saveEdit(c._id)} className="rounded-none mr-1"><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="rounded-none"><X className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ) : (
                <tr key={c._id} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 text-muted-foreground">{c.order}</td>
                  <td className="py-2.5 pr-4 font-medium text-foreground flex items-center gap-2">
                    {c.color && <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: c.color }} />}
                    {c.label}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs">{c.key}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{c.icon || '—'}</td>
                  <td className="py-2.5 pr-4">{int(c.schemeCount)}</td>
                  <td className="py-2.5 pr-4">
                    <button onClick={() => toggleActive(c)} className={`px-2 py-0.5 rounded-none text-[11px] font-bold ${c.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>{c.isActive ? 'Active' : 'Hidden'}</button>
                  </td>
                  <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => startEdit(c)} className="rounded-none mr-1"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => remove(c)} className="rounded-none text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {cats.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No categories yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

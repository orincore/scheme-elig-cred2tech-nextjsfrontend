'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminAuthApi } from '@/lib/services/api';
import { IndianRupee, RefreshCw, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Pricing {
  serviceType: string;
  label: string;
  amount: number;
  currency: string;
  isActive: boolean;
  updatedAt?: string;
}

const dt = (s?: string) => (s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

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

export default function AdminPricingPage() {
  const [rows, setRows] = useState<Pricing[]>([]);
  const [draft, setDraft] = useState<Record<string, { amount: string; isActive: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminAuthApi.listPricing();
      if (res?.success) {
        setRows(res.pricing || []);
        const d: Record<string, { amount: string; isActive: boolean }> = {};
        for (const p of res.pricing || []) d[p.serviceType] = { amount: String(p.amount), isActive: p.isActive };
        setDraft(d);
      }
      setError(null);
    } catch (e: any) { setError(e?.message || 'Failed to load pricing'); }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const save = async (p: Pricing) => {
    const d = draft[p.serviceType];
    const amount = Number(d.amount);
    if (!Number.isFinite(amount) || amount < 0) { setError('Amount must be a non-negative number'); return; }
    setSavingType(p.serviceType); setError(null); setOkMsg(null);
    try {
      const res = await adminAuthApi.updatePricing(p.serviceType, { amount, isActive: d.isActive });
      if (res?.success) { setOkMsg(`Updated ${p.label}`); await load(); setTimeout(() => setOkMsg(null), 2500); }
      else setError(res?.error || 'Update failed');
    } catch (e: any) { setError(e?.message || 'Update failed'); }
    finally { setSavingType(null); }
  };

  const dirty = (p: Pricing) => {
    const d = draft[p.serviceType];
    return d && (Number(d.amount) !== p.amount || d.isActive !== p.isActive);
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><IndianRupee className="h-5 w-5" /> Pricing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Set the amount (₹) charged for each paid action. Changes apply to new orders immediately.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="rounded-none"><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2.5 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}
      {okMsg && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-2.5 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {okMsg}
        </div>
      )}

      <Section title="Payment pricing" icon={IndianRupee}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                <th className="py-2 pr-4">Service</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount (₹)</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">Updated</th>
                <th className="py-2 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.serviceType} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium text-foreground">{p.label}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs">{p.serviceType}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">₹</span>
                      <input
                        type="number" min={0} step={1}
                        className="w-28 border border-border bg-background px-2 py-1.5 text-sm"
                        value={draft[p.serviceType]?.amount ?? ''}
                        onChange={(e) => setDraft((s) => ({ ...s, [p.serviceType]: { ...s[p.serviceType], amount: e.target.value } }))}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft[p.serviceType]?.isActive ?? false}
                        onChange={(e) => setDraft((s) => ({ ...s, [p.serviceType]: { ...s[p.serviceType], isActive: e.target.checked } }))}
                      />
                      <span className="text-xs text-muted-foreground">{draft[p.serviceType]?.isActive ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">{dt(p.updatedAt)}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <Button size="sm" disabled={!dirty(p) || savingType === p.serviceType} onClick={() => save(p)} className="rounded-none">
                      <Save className="h-3.5 w-3.5 mr-1" /> {savingType === p.serviceType ? 'Saving…' : 'Save'}
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No pricing rows found.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Disabling a service falls back to its built-in default price for new orders. Amounts are in whole rupees.
        </p>
      </Section>
    </div>
  );
}

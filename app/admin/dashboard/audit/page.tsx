'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminAuthApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

const dt = (s: string) => {
  const d = new Date(s);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

// Colour an action pill by keyword.
function actionPill(action: string): string {
  const a = (action || '').toUpperCase();
  if (a.includes('REJECT') || a.includes('BLOCK') || a.includes('DELETE'))         return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (a.includes('APPROV') || a.includes('UNBLOCK') || a.includes('ACTIVAT'))      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (a.includes('CREATED'))                                                        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
  if (a.includes('ASSIGN') || a.includes('REASSIGN'))                               return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (a.includes('STATUS') || a.includes('PASSWORD') || a.includes('SUSPEND'))      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (a.includes('LOGIN'))                                                          return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return 'bg-muted text-muted-foreground';
}
const labelize = (a: string) => (a || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function summarizeDetails(d: any): string {
  if (!d || typeof d !== 'object') return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (v == null || v === '') continue;
    parts.push(`${k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()}: ${v}`);
  }
  return parts.join(' · ');
}

export default function AuditLogPage() {
  const { admin } = useAdminAuth();
  const isSuper = admin?.role === 'SUPER_ADMIN';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminAuthApi.getAuditLog({ adminId, action, from, to, page: p, pageSize: 50 });
      if (res.success) setData(res);
    } catch (e) {
      console.error('Audit log error:', e);
    } finally {
      setLoading(false);
    }
  }, [adminId, action, from, to]);

  useEffect(() => {
    if (isSuper) load(1);
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper]);

  const apply = () => { setPage(1); load(1); };
  const clear = () => {
    setAdminId(''); setAction(''); setFrom(''); setTo(''); setPage(1);
    setLoading(true);
    adminAuthApi.getAuditLog({ page: 1, pageSize: 50 }).then((r: any) => { if (r.success) setData(r); }).finally(() => setLoading(false));
  };
  const goTo = (p: number) => { setPage(p); load(p); };

  const inputCls = 'block h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  if (!isSuper && !loading) {
    return (
      <div className="bg-card border border-border rounded-none">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Super-admin access required</p>
          <p className="text-xs text-muted-foreground">Only super-admins can view the audit log.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header + filters ─────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Accountability</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-1">Every admin action, with the admin who performed it</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(page)} className="gap-2">
            <RefreshCw className="h-4 w-4" />Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 mt-6">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">Admin ID</label>
            <input type="number" value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="e.g. 1" className={`${inputCls} w-24`} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className={`${inputCls} w-52`}>
              <option value="">All Actions</option>
              {(data?.actions || []).map((a: string) => <option key={a} value={a}>{labelize(a)}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </div>
          <Button size="sm" onClick={apply}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>
        </div>
      </div>

      {/* ─── Log table ────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-background">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            Activity {data?.total != null && <span className="text-xs font-normal text-muted-foreground">({data.total.toLocaleString('en-IN')} entries)</span>}
          </h3>
        </div>

        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : !data?.rows?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">No activity recorded</p>
            <p className="text-xs text-muted-foreground">Admin actions will appear here as they happen.</p>
          </div>
        ) : (
          <>
            <div className="overflow-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  <tr className="bg-background border-b-2 border-border">
                    {['Date / Time', 'Admin', 'Action', 'Target', 'Details'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r: any) => {
                    const { date, time } = dt(r.created_at);
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-sm text-foreground">{date}</div>
                          <div className="text-xs text-muted-foreground font-mono">{time}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-sm font-medium text-foreground truncate max-w-[160px]">{r.admin_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">Admin #{r.admin_id ?? '—'}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${actionPill(r.action)}`}>{labelize(r.action)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {r.target_type ? (
                            <span className="text-xs text-foreground">{r.target_type} <span className="font-mono text-muted-foreground">#{r.target_id ?? '—'}</span></span>
                          ) : <span className="text-xs text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs text-muted-foreground max-w-[320px] truncate" title={summarizeDetails(r.details)}>
                            {summarizeDetails(r.details) || '—'}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-xs text-muted-foreground">Page {data.page} of {data.totalPages} · {data.total.toLocaleString('en-IN')} entries</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => goTo(data.page - 1)} className="gap-1"><ChevronLeft className="h-4 w-4" />Prev</Button>
                <Button size="sm" variant="outline" disabled={data.page >= data.totalPages} onClick={() => goTo(data.page + 1)} className="gap-1">Next<ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

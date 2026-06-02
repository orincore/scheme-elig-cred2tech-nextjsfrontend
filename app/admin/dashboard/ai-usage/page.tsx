'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminAuthApi } from '@/lib/services/api';
import {
  DollarSign, Cpu, Hash, Users, Activity, RefreshCw, ChevronLeft, ChevronRight, Layers,
} from 'lucide-react';

// ── Formatting helpers ──────────────────────────────────────────────────────
const usd = (n: any) => `$${(Number(n) || 0).toFixed(4)}`;
const usdShort = (n: any) => {
  const v = Number(n) || 0;
  return v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`;
};
const int = (n: any) => (Number(n) || 0).toLocaleString('en-IN');
const inr = (n: any) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dt = (s: string) => {
  const d = new Date(s);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

const STAGE_LABEL: Record<string, { label: string; cls: string }> = {
  stage1_filter: { label: 'Stage 1 · Filter',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  stage2_verify: { label: 'Stage 2 · Verify',  cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  reverify:      { label: 'Re-verify',         cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  questionnaire: { label: 'Questionnaire',     cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

// Section wrapper matching the rest of the admin pages.
function Section({ title, icon: Icon, action, children }: { title: React.ReactNode; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-card border border-border rounded-none p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">{label}</p>
          <p className="text-2xl font-bold text-foreground truncate mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <Icon className={`h-7 w-7 shrink-0 ${color}`} />
      </div>
    </div>
  );
}

export default function AdminAiUsagePage() {
  const [summary, setSummary]   = useState<any>(null);
  const [log, setLog]           = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [logLoading, setLogLoading] = useState(false);

  // Filters
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');
  const [userId, setUserId] = useState('');
  const [stage, setStage]   = useState('');
  const [page, setPage]     = useState(1);

  const loadSummary = useCallback(async () => {
    try {
      const res = await adminAuthApi.getAiUsageSummary({ from, to, stage });
      if (res.success) setSummary(res.summary);
    } catch (e) {
      console.error('AI usage summary error:', e);
    }
  }, [from, to, stage]);

  const loadLog = useCallback(async (p = page) => {
    setLogLoading(true);
    try {
      const res = await adminAuthApi.getAiUsageLog({ from, to, userId, stage, page: p, pageSize: 50 });
      if (res.success) setLog(res);
    } catch (e) {
      console.error('AI usage log error:', e);
    } finally {
      setLogLoading(false);
    }
  }, [from, to, userId, stage, page]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadSummary(), loadLog(1)]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = async () => {
    setPage(1);
    setLoading(true);
    await Promise.all([loadSummary(), loadLog(1)]);
    setLoading(false);
  };

  const clearFilters = async () => {
    setFrom(''); setTo(''); setUserId(''); setStage(''); setPage(1);
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        adminAuthApi.getAiUsageSummary({}),
        adminAuthApi.getAiUsageLog({ page: 1, pageSize: 50 }),
      ]);
      if (s.success) setSummary(s.summary);
      if (l.success) setLog(l);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = async (p: number) => {
    setPage(p);
    await loadLog(p);
  };

  const totals    = summary?.totals || {};
  const byModel   = summary?.byModel || [];
  const byStage   = summary?.byStage || [];
  const byDay     = summary?.byDay || [];
  const topUsers  = summary?.topUsers || [];
  const rate      = summary?.rate || log?.rate || null;
  const maxDayCost = Math.max(...byDay.map((d: any) => Number(d.cost_usd) || 0), 0.0001);

  const inputCls = 'block h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Cost Monitoring</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">AI Usage &amp; Cost</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Complete record of every AI engine call — spend, tokens, and performance per user
            </p>
          </div>
          <div className="flex items-center gap-3">
            {rate && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                1 USD = ₹{Number(rate.rate).toFixed(2)}
                <span className="font-normal opacity-70">· {rate.date}</span>
              </span>
            )}
            <Button variant="outline" size="sm" onClick={applyFilters} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mt-6">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">User ID</label>
            <input type="number" value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g. 42" className={`${inputCls} w-28`} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">Stage</label>
            <select value={stage} onChange={e => setStage(e.target.value)} className={`${inputCls} w-44`}>
              <option value="">All Stages</option>
              {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={applyFilters}>Apply</Button>
          <Button size="sm" variant="ghost" onClick={clearFilters}>Clear</Button>
        </div>
      </div>

      {/* ─── Summary cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} color="text-green-500" label="Total Cost"
          value={usd(totals.total_cost_usd)} sub={`≈ ${inr(totals.total_cost_inr)} · ${int(totals.total_sessions)} sessions`} />
        <StatCard icon={Activity} color="text-blue-500" label="Total API Calls"
          value={int(totals.total_calls)} sub={`${int(totals.unique_users)} unique users`} />
        <StatCard icon={Hash} color="text-indigo-500" label="Total Tokens"
          value={int(totals.total_tokens)} sub={`${int(totals.cached_tokens)} cached (discounted)`} />
        <StatCard icon={Cpu} color="text-orange-500" label="Avg Cost / Call"
          value={usd(Number(totals.total_calls) ? Number(totals.total_cost_usd) / Number(totals.total_calls) : 0)}
          sub={`${int(totals.completion_tokens)} output tokens`} />
      </div>

      {/* ─── Cost by Stage ────────────────────────────────────────────────── */}
      <Section title="Cost by Stage" icon={Layers}>
        {byStage.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No usage recorded yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm" style={{ minWidth: 560 }}>
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground border-b-2 border-border">
                  <th className="py-2 pr-4 font-extrabold">Stage</th>
                  <th className="py-2 pr-4 font-extrabold text-right">Calls</th>
                  <th className="py-2 pr-4 font-extrabold text-right">Schemes</th>
                  <th className="py-2 pr-4 font-extrabold text-right">Tokens</th>
                  <th className="py-2 font-extrabold text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byStage.map((s: any) => {
                  const cfg = STAGE_LABEL[s.stage] || { label: s.stage, cls: 'bg-muted text-muted-foreground' };
                  return (
                    <tr key={s.stage} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">{int(s.calls)}</td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">{int(s.schemes)}</td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">{int(s.tokens)}</td>
                      <td className="py-2.5 text-right">
                        <div className="font-semibold text-green-600 dark:text-green-400">{usd(s.cost_usd)}</div>
                        <div className="text-[11px] text-muted-foreground">≈ {inr(s.cost_inr)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ─── By-model + Top users ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Section title="Cost by Model" icon={Layers}>
          {byModel.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No usage recorded yet.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground border-b-2 border-border">
                    <th className="py-2 pr-4 font-extrabold">Model</th>
                    <th className="py-2 pr-4 font-extrabold text-right">Calls</th>
                    <th className="py-2 pr-4 font-extrabold text-right">Tokens</th>
                    <th className="py-2 font-extrabold text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((m: any) => (
                    <tr key={m.model} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs text-foreground">{m.model}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{int(m.calls)}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{int(m.tokens)}</td>
                      <td className="py-2 text-right">
                        <div className="font-semibold text-green-600 dark:text-green-400">{usd(m.cost_usd)}</div>
                        <div className="text-[11px] text-muted-foreground">≈ {inr(m.cost_inr)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Top Spenders" icon={Users}>
          {topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No usage recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {topUsers.map((u: any, i: number) => (
                <div key={u.msme_user_id ?? i} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.mobile_number ? `${u.mobile_number} · ` : ''}ID {u.msme_user_id ?? '—'} · {int(u.calls)} calls
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">{usd(u.cost_usd)}</p>
                    <p className="text-[11px] text-muted-foreground">≈ {inr(u.cost_inr)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ─── Daily spend ──────────────────────────────────────────────────── */}
      <Section title="Daily Spend (last 30 days with activity)" icon={Activity}>
        {byDay.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No usage recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {byDay.map((d: any) => (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{d.day}</span>
                <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                  <div className="h-full bg-green-500/70 rounded" style={{ width: `${Math.max(2, (Number(d.cost_usd) / maxDayCost) * 100)}%` }} />
                </div>
                <span className="text-xs font-semibold text-foreground w-20 text-right shrink-0">{usd(d.cost_usd)}</span>
                <span className="text-xs text-green-600 dark:text-green-400 w-24 text-right shrink-0">≈ {inr(d.cost_inr)}</span>
                <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{int(d.calls)} calls</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── Call log ─────────────────────────────────────────────────────── */}
      <Section
        title={<>Call Log {log?.total != null && <span className="text-xs font-normal text-muted-foreground">({int(log.total)} records)</span>}</>}
        icon={Cpu}
      >
        {logLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !log?.rows?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No AI calls recorded for this filter.</p>
        ) : (
          <>
            <div className="overflow-auto -mx-5">
              <table className="w-full text-sm" style={{ minWidth: 860 }}>
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground border-b-2 border-border bg-background">
                    {['Date / Time', 'User', 'Stage', 'Model', 'Schemes', 'Tokens', 'Latency', 'Cost'].map((h, idx) => (
                      <th key={h} className={`py-2.5 px-5 font-extrabold ${idx >= 4 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {log.rows.map((r: any) => {
                    const { date, time } = dt(r.created_at);
                    const stage = STAGE_LABEL[r.stage] || { label: r.stage, cls: 'bg-muted text-muted-foreground' };
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-5 whitespace-nowrap">
                          <div className="text-foreground">{date}</div>
                          <div className="text-xs text-muted-foreground font-mono">{time}</div>
                        </td>
                        <td className="py-2.5 px-5">
                          <div className="text-foreground truncate max-w-[160px]">{r.user_name}</div>
                          <div className="text-xs text-muted-foreground">ID {r.msme_user_id ?? '—'}</div>
                        </td>
                        <td className="py-2.5 px-5">
                          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${stage.cls}`}>{stage.label}</span>
                        </td>
                        <td className="py-2.5 px-5 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.model}</td>
                        <td className="py-2.5 px-5 text-right text-muted-foreground">{int(r.schemes_count)}</td>
                        <td className="py-2.5 px-5 text-right text-muted-foreground">
                          {int(r.total_tokens)}
                          {r.cached_tokens > 0 && <span className="text-[10px] text-muted-foreground/70 block">{int(r.cached_tokens)} cached</span>}
                        </td>
                        <td className="py-2.5 px-5 text-right text-muted-foreground">{r.elapsed_ms != null ? `${(r.elapsed_ms / 1000).toFixed(1)}s` : '—'}</td>
                        <td className="py-2.5 px-5 text-right whitespace-nowrap">
                          <div className="font-semibold text-green-600 dark:text-green-400">{usdShort(r.cost_usd)}</div>
                          <div className="text-[10px] text-muted-foreground">≈ {inr(r.cost_inr)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Page {log.page} of {log.totalPages} · {int(log.total)} total records
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={log.page <= 1} onClick={() => goToPage(log.page - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button size="sm" variant="outline" disabled={log.page >= log.totalPages} onClick={() => goToPage(log.page + 1)} className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

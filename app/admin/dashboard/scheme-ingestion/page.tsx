'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminAuthApi } from '@/lib/services/api';
import {
  Database, DatabaseZap, Layers, RefreshCw, PlayCircle, CalendarClock,
  CheckCircle2, XCircle, Loader2, AlertTriangle,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────
const int = (n: any) => (Number(n) || 0).toLocaleString('en-IN');
const SOURCE_LABEL: Record<string, string> = { emsme: 'eMSME (Saarthi)', myscheme: 'myScheme.gov.in' };
const sourceLabel = (s: string) => SOURCE_LABEL[s] || s;

const dt = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const dur = (ms?: number | null) => {
  if (!ms && ms !== 0) return '—';
  const s = Math.round((ms as number) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    running: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Loader2, label: 'Running' },
    success: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2, label: 'Success' },
    failed:  { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle, label: 'Failed' },
  };
  const s = map[status || ''] || { cls: 'bg-muted text-muted-foreground', icon: AlertTriangle, label: status || '—' };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[11px] font-bold ${s.cls}`}>
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {s.label}
    </span>
  );
}

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

export default function SchemeIngestionPage() {
  const [stats, setStats]   = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [runs, setRuns]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState<string | null>(null); // source being triggered
  const [force, setForce]   = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [st, stat, rn] = await Promise.all([
        adminAuthApi.getSchemeIngestionStats(),
        adminAuthApi.getIngestionStatus(),
        adminAuthApi.getIngestionRuns({ limit: 30 }),
      ]);
      if (st?.success) setStats(st);
      if (stat?.success) setStatus(stat);
      if (rn?.success) setRuns(rn.runs || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load ingestion data');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await loadAll(); setLoading(false); })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 3s while a run is in progress.
  const running = !!status?.running;
  useEffect(() => {
    if (running && !pollRef.current) {
      pollRef.current = setInterval(loadAll, 3000);
    } else if (!running && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      loadAll(); // final refresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const trigger = async (source: 'emsme' | 'myscheme') => {
    const label = sourceLabel(source);
    const msg = force
      ? `Run a FULL refresh of ${label}? This re-fetches every scheme and may take several minutes.`
      : `Run an incremental update of ${label}? New/changed schemes will be fetched.`;
    if (!window.confirm(msg)) return;
    setBusy(source);
    setError(null);
    try {
      const res = await adminAuthApi.runIngestion(source, force);
      if (res?.success) {
        await loadAll(); // status flips to running → polling kicks in
      } else {
        setError(res?.error || 'Failed to start ingestion');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to start ingestion');
    } finally {
      setBusy(null);
    }
  };

  const countFor = (src: string) =>
    (stats?.bySource || []).find((b: any) => b.source === src)?.count ?? 0;
  const levelsFor = (src: string) => stats?.byLevel?.[src] || {};

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <DatabaseZap className="h-5 w-5" /> Scheme Ingestion
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Refresh the government-scheme catalogue used by the AI eligibility engine.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} className="rounded-none">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2.5 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Cron banner */}
      <div className="bg-card border border-border px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        Auto-refresh runs <span className="font-bold text-foreground">weekly · Sunday 02:00</span> (eMSME → myScheme, incremental).
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Database} label="Total schemes" value={int(stats?.total)} color="text-indigo-500" />
        <StatCard icon={DatabaseZap} label="eMSME schemes" value={int(countFor('emsme'))}
          sub={dt(stats?.lastRun?.emsme?.startedAt)} color="text-emerald-500" />
        <StatCard icon={Layers} label="myScheme schemes" value={int(countFor('myscheme'))}
          sub={dt(stats?.lastRun?.myscheme?.startedAt)} color="text-sky-500" />
        <StatCard icon={running ? Loader2 : CheckCircle2}
          label="Engine status"
          value={running ? `Running: ${sourceLabel(status?.current?.source)}` : 'Idle'}
          color={running ? 'text-blue-500' : 'text-green-500'} />
      </div>

      {/* Manual run controls */}
      <Section title="Manual update" icon={PlayCircle}
        action={
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="accent-current" />
            Force full refresh
          </label>
        }>
        <div className="flex flex-wrap gap-3">
          {(['emsme', 'myscheme'] as const).map((src) => (
            <Button key={src} onClick={() => trigger(src)} disabled={running || busy === src}
              className="rounded-none">
              {busy === src
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <PlayCircle className="h-4 w-4 mr-1.5" />}
              Run {sourceLabel(src)}
            </Button>
          ))}
          {running && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              A run is in progress — buttons are disabled until it finishes.
            </span>
          )}
        </div>
      </Section>

      {/* Source breakdown */}
      <Section title="Catalogue by source" icon={Layers}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Central</th>
                <th className="py-2 pr-4">State</th>
                <th className="py-2 pr-4">Last run</th>
              </tr>
            </thead>
            <tbody>
              {['emsme', 'myscheme'].map((src) => {
                const lv = levelsFor(src);
                const last = stats?.lastRun?.[src];
                return (
                  <tr key={src} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-bold text-foreground">{sourceLabel(src)}</td>
                    <td className="py-2.5 pr-4">{int(countFor(src))}</td>
                    <td className="py-2.5 pr-4">{int(lv['Central'])}</td>
                    <td className="py-2.5 pr-4">{int((lv['State'] || 0) + (lv['State/ UT'] || 0))}</td>
                    <td className="py-2.5 pr-4 flex items-center gap-2">
                      {last ? <StatusBadge status={last.status} /> : <span className="text-muted-foreground">never</span>}
                      <span className="text-xs text-muted-foreground">{dt(last?.startedAt)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Run history */}
      <Section title="Run history" icon={CalendarClock}>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No ingestion runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Trigger</th>
                  <th className="py-2 pr-4">Started</th>
                  <th className="py-2 pr-4">Duration</th>
                  <th className="py-2 pr-4">Inserted</th>
                  <th className="py-2 pr-4">Updated</th>
                  <th className="py-2 pr-4">Failed</th>
                  <th className="py-2 pr-4">By</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r._id} className="border-b border-border/50 align-top">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{sourceLabel(r.source)}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={r.status} />
                      {r.error && <div className="text-[11px] text-red-500 mt-1 max-w-[220px] truncate" title={r.error}>{r.error}</div>}
                    </td>
                    <td className="py-2.5 pr-4 capitalize text-muted-foreground">{r.trigger}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{dt(r.startedAt)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{dur(r.durationMs)}</td>
                    <td className="py-2.5 pr-4">{int(r.stats?.inserted)}</td>
                    <td className="py-2.5 pr-4">{int(r.stats?.updated)}</td>
                    <td className="py-2.5 pr-4">{(r.stats?.failed || 0) > 0
                      ? <span className="text-red-500 font-bold">{int(r.stats?.failed)}</span>
                      : int(r.stats?.failed)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground truncate max-w-[160px]" title={r.triggeredBy}>{r.triggeredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

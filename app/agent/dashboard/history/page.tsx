'use client';

import { useEffect, useState } from 'react';
import { casesApi } from '@/lib/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { History, Search, Calendar, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

const PILL = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: 'Approved', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  CLOSED:   { label: 'Closed',   cls: 'bg-muted text-muted-foreground' },
};

export default function AgentHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    casesApi.getAgentCaseHistory()
      .then((res) => {
        if (res.success) setHistory(res.cases ?? res.history ?? []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = history.filter((c: any) => {
    const q = search.toLowerCase();
    return !q ||
      (c.case_number || c.caseNumber || '').toLowerCase().includes(q) ||
      (c.scheme_name || c.schemeName || '').toLowerCase().includes(q) ||
      (c.msme_name || c.msmeName || '').toLowerCase().includes(q);
  });

  const approved  = history.filter((c: any) => c.status === 'APPROVED').length;
  const rejected  = history.filter((c: any) => c.status === 'REJECTED').length;
  const closed    = history.filter((c: any) => c.status === 'CLOSED').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Records</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Case History</h1>
        <p className="text-sm text-muted-foreground mt-1">View your completed and past cases</p>

        <div className="flex items-center gap-5 mt-5 flex-wrap">
          <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Total</p><p className="text-2xl font-bold text-foreground">{history.length}</p></div>
          <div className="w-px h-8 bg-border" />
          <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Approved</p><p className="text-2xl font-bold text-green-500">{approved}</p></div>
          <div className="w-px h-8 bg-border" />
          <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Rejected</p><p className="text-2xl font-bold text-red-500">{rejected}</p></div>
          <div className="w-px h-8 bg-border" />
          <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Closed</p><p className="text-2xl font-bold text-muted-foreground">{closed}</p></div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-none p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case number, scheme, or MSME…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* History list */}
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-background">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            {filtered.length === 0 ? 'No history found' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No history yet</p>
            <p className="text-xs text-muted-foreground">Closed and completed cases will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c: any, idx: number) => {
              const cfg = STATUS_CFG[c.status] ?? { label: c.status?.replace(/_/g, ' ') || '—', cls: 'bg-muted text-muted-foreground' };
              const date = c.closed_at || c.closedAt || c.updated_at || c.updatedAt || c.created_at || c.createdAt;
              return (
                <div key={`${c.id}-${idx}`} className="flex items-start justify-between px-5 py-4 hover:bg-muted/20 transition-colors gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[13px] font-bold text-foreground font-mono">{c.case_number || c.caseNumber}</span>
                      <span className={`${PILL} ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.scheme_name || c.schemeName || '—'}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">MSME: {c.msme_name || c.msmeName || '—'}</p>
                    {date && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {c.closure_notes || c.closureNotes ? (
                      <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 rounded px-2 py-1 leading-snug">
                        {c.closure_notes || c.closureNotes}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/agent/dashboard/cases/${encodeURIComponent(c.case_number || c.caseNumber || c.id)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                  >
                    View <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

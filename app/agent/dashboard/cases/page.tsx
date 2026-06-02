'use client';

import { useEffect, useState } from 'react';
import { useAgentSocket } from '@/lib/hooks/useSocket';
import { casesApi } from '@/lib/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Briefcase, Search, ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';

const PILL = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  NEW:               { label: 'New',          cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  ASSIGNED:          { label: 'Assigned',     cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  IN_PROGRESS:       { label: 'In Progress',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  UNDER_REVIEW:      { label: 'Under Review', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  DOCUMENTS_PENDING: { label: 'Docs Pending', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  APPROVED:          { label: 'Approved',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED:          { label: 'Rejected',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  CLOSED:            { label: 'Closed',       cls: 'bg-muted text-muted-foreground' },
};

const PRIORITY_CFG: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  LOW:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Cases' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'DOCUMENTS_PENDING', label: 'Docs Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function AgentCasesPage() {
  const { assignedCases, setAssignedCases } = useAgentSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    casesApi.getAgentCases()
      .then((res) => { if (res.success) setAssignedCases(res.cases); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [setAssignedCases]);

  const filtered = assignedCases.filter((c: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (c.case_number || c.caseNumber || '').toLowerCase().includes(q) ||
      (c.scheme_name || c.schemeName || '').toLowerCase().includes(q) ||
      (c.msme_name || c.msmeName || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Work Queue</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">My Cases</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and track your assigned cases</p>

        <div className="flex items-center gap-5 mt-5 flex-wrap">
          <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Total</p><p className="text-2xl font-bold text-foreground">{assignedCases.length}</p></div>
          <div className="w-px h-8 bg-border" />
          <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Active</p><p className="text-2xl font-bold text-amber-500">{assignedCases.filter((c: any) => !['CLOSED','APPROVED','REJECTED'].includes(c.status)).length}</p></div>
          <div className="w-px h-8 bg-border" />
          <div><p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Docs Pending</p><p className="text-2xl font-bold text-orange-500">{assignedCases.filter((c: any) => c.status === 'DOCUMENTS_PENDING').length}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-none p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case number, scheme, or MSME…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STATUS_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Cases list */}
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-background">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            {filtered.length === 0 ? 'No cases found' : `${filtered.length} case${filtered.length !== 1 ? 's' : ''}`}
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Briefcase className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No cases found</p>
            <p className="text-xs text-muted-foreground">{search ? 'Try adjusting your search.' : 'Cases assigned to you will appear here.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c: any, idx: number) => {
              const cfg = STATUS_CFG[c.status] ?? { label: c.status, cls: 'bg-muted text-muted-foreground' };
              return (
                <div key={`${c.id}-${idx}`} className="flex items-start justify-between px-5 py-4 hover:bg-muted/20 transition-colors gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[13px] font-bold text-foreground font-mono">{c.case_number || c.caseNumber}</span>
                      <span className={`${PILL} ${cfg.cls}`}>{cfg.label}</span>
                      {c.priority && <span className={`${PILL} ${PRIORITY_CFG[c.priority] ?? 'bg-muted text-muted-foreground'}`}>{c.priority}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.scheme_name || c.schemeName || '—'}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      MSME: {c.msme_name || c.msmeName || '—'}
                    </p>
                    {(c.assigned_at || c.assignedAt) && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        Assigned {new Date(c.assigned_at || c.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/agent/dashboard/cases/${c.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
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

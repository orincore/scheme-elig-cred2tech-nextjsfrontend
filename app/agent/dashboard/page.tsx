'use client';

import { useEffect, useState } from 'react';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { useAgentSocket } from '@/lib/hooks/useSocket';
import { casesApi } from '@/lib/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
} from 'lucide-react';
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

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status?.replace(/_/g, ' ') || '—', cls: 'bg-muted text-muted-foreground' };
  return <span className={`${PILL} ${cfg.cls}`}>{cfg.label}</span>;
}

interface CaseStats { total: number; inProgress: number; pendingDocs: number; closed: number; }

export default function AgentDashboardPage() {
  const { agent } = useAgentAuth();
  const { assignedCases, setAssignedCases } = useAgentSocket();
  const [stats, setStats] = useState<CaseStats>({ total: 0, inProgress: 0, pendingDocs: 0, closed: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await casesApi.getAgentCases();
        if (response.success) {
          const cases = response.cases;
          setAssignedCases(cases);
          setStats({
            total:       cases.length,
            inProgress:  cases.filter((c: any) => c.status === 'IN_PROGRESS').length,
            pendingDocs: cases.filter((c: any) => c.status === 'DOCUMENTS_PENDING').length,
            closed:      cases.filter((c: any) => ['CLOSED', 'APPROVED'].includes(c.status)).length,
          });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [setAssignedCases]);

  const recentCases = assignedCases.slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Overview</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Welcome back, {agent?.fullName?.split(' ')[0] || 'Agent'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your cases today.</p>

        {/* Stats strip */}
        <div className="flex items-center gap-5 mt-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Assigned cases</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">In Progress</p>
            <p className="text-2xl font-bold text-amber-500">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">Active work</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Docs Pending</p>
            <p className="text-2xl font-bold text-orange-500">{stats.pendingDocs}</p>
            <p className="text-xs text-muted-foreground">Awaiting upload</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Closed</p>
            <p className="text-2xl font-bold text-green-500">{stats.closed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>

      {/* ── Quick-stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases',   value: stats.total,       icon: Briefcase,    color: 'text-blue-500' },
          { label: 'In Progress',   value: stats.inProgress,  icon: Clock,        color: 'text-amber-500' },
          { label: 'Pending Docs',  value: stats.pendingDocs, icon: AlertCircle,  color: 'text-orange-500' },
          { label: 'Completed',     value: stats.closed,      icon: CheckCircle,  color: 'text-green-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-none p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-3xl font-extrabold text-foreground mt-0.5">{value}</p>
            </div>
            <Icon className={`h-8 w-8 shrink-0 ${color}`} />
          </div>
        ))}
      </div>

      {/* ── Recent Cases ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Recent Cases
          </h3>
          <Link
            href="/agent/dashboard/cases"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Briefcase className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No cases assigned yet</p>
            <p className="text-xs text-muted-foreground">Cases will appear here when assigned by an admin</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentCases.map((c: any, idx: number) => (
              <div
                key={`${c.id}-${idx}`}
                className="flex items-start justify-between px-5 py-4 hover:bg-muted/20 transition-colors gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[13px] font-bold text-foreground font-mono">
                      {c.case_number || c.caseNumber}
                    </span>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.scheme_name || c.schemeName || c.schemeId || '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(c.created_at || c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Link
                  href={`/agent/dashboard/cases/${c.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
                >
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tip card ────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-none p-5 flex items-start gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-foreground">Keep your availability updated</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admins assign cases based on your expertise and current availability status. Set yourself as Available when ready to take new cases.
          </p>
        </div>
      </div>
    </div>
  );
}

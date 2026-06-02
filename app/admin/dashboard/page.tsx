'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminSocket } from '@/lib/hooks/useSocket';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  UserCheck,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { casesApi } from '@/lib/services/api';

export default function AdminDashboardPage() {
  const { stats, isLoading, fetchStats, fetchPendingAgents, pendingAgents } = useAdminAuth();
  const { newCases: socketNewCases } = useAdminSocket();
  const [recentCases, setRecentCases] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchPendingAgents();
  }, [fetchStats, fetchPendingAgents]);

  useEffect(() => {
    const fetchRecentCases = async () => {
      try {
        const response = await casesApi.getAllCases();
        if (response.success) {
          // Get only NEW cases and limit to recent ones
          const newCases = response.cases
            .filter((c: any) => c.status === 'NEW')
            .slice(0, 5);
          setRecentCases(newCases);
        }
      } catch (error) {
        console.error('Error fetching recent cases:', error);
      }
    };

    fetchRecentCases();
  }, []);

  // Combine socket cases with API cases for real-time updates
  const allRecentCases = [...socketNewCases, ...recentCases].slice(0, 5);

  const n = (v: any) => Number(v) || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ──────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">
          Platform Overview
        </p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of agents, cases, and AI system performance
            </p>
          </div>
          <Link
            href="/admin/dashboard/ai-usage"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <DollarSign className="h-3.5 w-3.5" />
            AI Usage &amp; Cost
          </Link>
        </div>

        {/* Inline stats row */}
        <div className="flex items-center gap-5 mt-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Total Agents</p>
            <p className="text-2xl font-bold text-foreground">{n(stats?.agents?.total_agents)}</p>
            <p className="text-xs text-muted-foreground">{n(stats?.agents?.approved_agents)} approved</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Pending</p>
            <p className="text-2xl font-bold text-amber-500">{n(stats?.agents?.pending_agents)}</p>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Total Cases</p>
            <p className="text-2xl font-bold text-foreground">{n(stats?.cases?.total_cases)}</p>
            <p className="text-xs text-muted-foreground">{n(stats?.cases?.in_progress_cases)} in progress</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">New Cases</p>
            <p className="text-2xl font-bold text-orange-500">{n(stats?.cases?.new_cases)}</p>
            <p className="text-xs text-muted-foreground">Need assignment</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Blocked</p>
            <p className="text-2xl font-bold text-red-500">{n(stats?.agents?.blocked_agents)}</p>
            <p className="text-xs text-muted-foreground">Agents</p>
          </div>
        </div>
      </div>

      {/* ─── AI Engine Spend ──────────────────────────────────────────────── */}
      <Link href="/admin/dashboard/ai-usage" className="block group">
        <div className="bg-card border border-border rounded-none px-5 py-4 hover:bg-muted/20 transition-colors">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-foreground">AI Engine Spend</p>
                <p className="text-xs text-muted-foreground">Cost of eligibility analysis (OpenAI)</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Last 30 days</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  ${(Number(stats?.ai?.cost_30d_usd) || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ ₹{(Number(stats?.ai?.cost_30d_inr) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} · {n(stats?.ai?.calls_30d).toLocaleString('en-IN')} calls
                </p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">All time</p>
                <p className="text-xl font-bold text-foreground">
                  ${(Number(stats?.ai?.total_cost_usd) || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ ₹{(Number(stats?.ai?.total_cost_inr) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} · {n(stats?.ai?.total_calls).toLocaleString('en-IN')} calls
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </Link>

      {/* ─── Two-column: pending approvals + recent cases ─────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5 items-start">

        {/* Pending Agent Approvals */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              Pending Agent Approvals
              {pendingAgents.length > 0 && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                  {pendingAgents.length}
                </span>
              )}
            </h3>
            <Link href="/admin/dashboard/approvals" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="px-5 py-2">
            {pendingAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <UserCheck className="h-9 w-9 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-foreground">No pending approvals</p>
                <p className="text-xs text-muted-foreground mt-0.5">All agent registrations have been processed</p>
              </div>
            ) : (
              pendingAgents.slice(0, 4).map((agent) => (
                <div key={agent.id} className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {agent.fullName?.[0] || 'A'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{agent.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.email}{agent.region ? ` · ${agent.region}` : ''}</p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/dashboard/approvals?agent=${agent.id}`}
                    className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                  >
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Cases */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Recent Cases
              {allRecentCases.length > 0 && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  {allRecentCases.length} new
                </span>
              )}
            </h3>
            <Link href="/admin/dashboard/cases" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="px-5 py-2">
            {allRecentCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Briefcase className="h-9 w-9 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-foreground">No new cases</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cases appear when MSMEs submit applications</p>
              </div>
            ) : (
              allRecentCases.slice(0, 4).map((caseItem) => (
                <div key={caseItem.id} className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground font-mono truncate">{caseItem.case_number || caseItem.caseNumber}</p>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">NEW</span>
                    </div>
                    <p className="text-xs text-foreground truncate mt-0.5">{caseItem.scheme_name || caseItem.schemeName}</p>
                    <p className="text-xs text-muted-foreground truncate">{caseItem.msme_name || caseItem.msmeName}</p>
                  </div>
                  <Link
                    href={`/admin/dashboard/cases?assign=${caseItem.id}`}
                    className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                  >
                    Assign
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

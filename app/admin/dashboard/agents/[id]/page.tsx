'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminAuthApi } from '@/lib/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Calendar,
  ShieldCheck, Star, Clock, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

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

function ApprovalPill({ status }: { status: string }) {
  const cls =
    status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
    status === 'PENDING'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return <span className={`${PILL} ${cls}`}>{status?.charAt(0) + status?.slice(1).toLowerCase()}</span>;
}

function AccountPill({ status, approval }: { status: string; approval: string }) {
  if (approval === 'PENDING') return <span className={`${PILL} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}>Pending Approval</span>;
  if (approval === 'REJECTED') return <span className={`${PILL} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`}>Rejected</span>;
  if (status === 'BLOCKED') return <span className={`${PILL} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`}>Blocked</span>;
  if (status === 'SUSPENDED') return <span className={`${PILL} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`}>Suspended</span>;
  return <span className={`${PILL} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>Active</span>;
}

function AvailPill({ availability }: { availability: string }) {
  const cls =
    availability === 'AVAILABLE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
    availability === 'BUSY'      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
    availability === 'OFFLINE'   ? 'bg-muted text-muted-foreground' :
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  return <span className={`${PILL} ${cls}`}>{availability?.replace(/_/g, ' ')}</span>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[140px] shrink-0 pt-0.5">{label}</span>
      <span className="text-[13px] text-foreground flex-1">{value ?? <span className="text-muted-foreground/40">—</span>}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminAuthApi.getAgentById(id)
      .then((res) => { if (res.success) setData(res); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load agent'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Back
        </button>
        <div className="bg-card border border-border rounded-none flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Agent not found</p>
        </div>
      </div>
    );
  }

  const { agent, cases } = data;
  const activeCases = cases?.filter((c: any) => !['CLOSED', 'APPROVED', 'REJECTED'].includes(c.status)) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-border pb-6">
        <button
          onClick={() => router.push('/admin/dashboard/agents')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />Back to Agents
        </button>

        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Agent Profile</p>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
              {agent.fullName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground">{agent.fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">{agent.employeeId}</span>
                <span className="text-muted-foreground/30">·</span>
                <AccountPill status={agent.status} approval={agent.approvalStatus} />
                {agent.availability && <AvailPill availability={agent.availability} />}
              </div>
              {agent.region && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{agent.region}
                </p>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{cases?.length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Cases</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-amber-500">{activeCases.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{agent.loginCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Logins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Contact */}
        <Section title="Contact & Identity" icon={User}>
          <Row label="Full Name"    value={agent.fullName} />
          <Row label="Employee ID"  value={<span className="font-mono">{agent.employeeId}</span>} />
          <Row label="Email"        value={<span className="font-mono">{agent.email}</span>} />
          <Row label="Phone"        value={<span className="font-mono">{agent.phone}</span>} />
          <Row label="Gender"       value={agent.gender} />
          <Row label="Region"       value={agent.region} />
          <Row label="Availability" value={agent.availability && <AvailPill availability={agent.availability} />} />
        </Section>

        {/* Account status */}
        <Section title="Account Status" icon={ShieldCheck}>
          <Row label="Account"       value={<AccountPill status={agent.status} approval={agent.approvalStatus} />} />
          <Row label="Approval"      value={<ApprovalPill status={agent.approvalStatus} />} />
          {agent.approvedBy && <Row label="Approved By" value={agent.approvedBy} />}
          {agent.approvedAt && <Row label="Approved At" value={new Date(agent.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />}
          {agent.rejectionReason && <Row label="Rejection Reason" value={<span className="text-destructive">{agent.rejectionReason}</span>} />}
          <Row label="Last Login"    value={agent.lastLoginAt ? new Date(agent.lastLoginAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'} />
          <Row label="Registered"    value={agent.createdAt ? new Date(agent.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
        </Section>

        {/* Expertise */}
        <Section title="Expertise & Skills" icon={Star}>
          {agent.expertise?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {agent.expertise.map((e: string) => (
                <span key={e} className="text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">{e}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic mb-3">No expertise listed</p>
          )}
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 mt-2">Certifications</p>
          {agent.certifications?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {agent.certifications.map((c: string) => (
                <span key={c} className="text-[11px] font-semibold bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">No certifications listed</p>
          )}
        </Section>

        {/* Cases */}
        <Section title={`Assigned Cases (${cases?.length ?? 0})`} icon={Briefcase}>
          {!cases?.length ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground/50 italic">No cases assigned</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {cases.map((c: any) => {
                const cfg = STATUS_CFG[c.status] ?? { label: c.status, cls: 'bg-muted text-muted-foreground' };
                return (
                  <div key={c.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[12px] font-bold text-foreground font-mono">{c.caseNumber}</span>
                        <span className={`${PILL} ${cfg.cls}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.schemeName || '—'}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        <Calendar className="inline h-2.5 w-2.5 mr-0.5" />
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <Link
                      href={`/admin/dashboard/cases/${c.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />View
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

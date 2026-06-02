'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminAuthApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Shared pill styles ──────────────────────────────────────────────────────

const PILL = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full';

function KycPill({ status }: { status: string }) {
  const cls =
    status === 'VERIFIED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
    status === 'PENDING'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
    'bg-muted text-muted-foreground';
  return <span className={`${PILL} ${cls}`}>{status || '—'}</span>;
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  NEW:               { label: 'New',            cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  ASSIGNED:          { label: 'Assigned',       cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  IN_PROGRESS:       { label: 'In Progress',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  UNDER_REVIEW:      { label: 'Under Review',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  DOCUMENTS_PENDING: { label: 'Docs Pending',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  APPROVED:          { label: 'Approved',       cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED:          { label: 'Rejected',       cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  CLOSED:            { label: 'Closed',         cls: 'bg-muted text-muted-foreground' },
  ESCALATED:         { label: 'Escalated',      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
};
const PRIORITY_CFG: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  LOW:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status?.replace(/_/g, ' ') || '—', cls: 'bg-muted text-muted-foreground' };
  return <span className={`${PILL} ${cfg.cls}`}>{cfg.label}</span>;
}
function PriorityPill({ priority }: { priority: string }) {
  if (!priority) return null;
  return <span className={`${PILL} ${PRIORITY_CFG[priority] ?? 'bg-muted text-muted-foreground'}`}>{priority}</span>;
}

// ── Small data-row helper ───────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[160px]">{label}</span>
      <span className="text-[13px] text-foreground flex-1">{value ?? '—'}</span>
    </div>
  );
}

function BoolRow({ label, value }: { label: string; value: boolean | null | undefined }) {
  if (value === null || value === undefined) return null;
  return (
    <Row
      label={label}
      value={
        <span className={`${PILL} ${value ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      }
    />
  );
}

// ── Section card ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-none">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MsmeUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'business' | 'cases'>('personal');

  useEffect(() => {
    if (!id) return;
    adminAuthApi.getMsmeUserDetail(id)
      .then((res) => { if (res.success) setData(res); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground mb-4">User not found</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const { user, businesses, cases } = data;
  const primaryBiz = businesses?.find((b: any) => b.isPrimary) ?? businesses?.[0] ?? null;
  const activeCases = cases?.filter((c: any) => !['CLOSED', 'APPROVED', 'REJECTED'].includes(c.status)) ?? [];

  const tabs = [
    { key: 'personal', label: 'Personal Info', icon: User },
    { key: 'business', label: `Business${businesses?.length > 1 ? ` (${businesses.length})` : ''}`, icon: Building2 },
    { key: 'cases',    label: `Cases (${cases?.length ?? 0})`, icon: Briefcase },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button
          onClick={() => router.push('/admin/dashboard/msme-users')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to MSME Users
        </button>

        <div className="border-b-2 border-border pb-5">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">MSME User Profile</p>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">{user.name}</h1>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{user.msmCode || `#${user.id}`}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono">{user.mobile}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                  {user.status && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <KycPill status={user.kycStatus} />
                    </>
                  )}
                </div>
                {primaryBiz?.legalName && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {primaryBiz.legalName}
                    {primaryBiz.enterpriseCategory && (
                      <span className="text-muted-foreground/60">· {primaryBiz.enterpriseCategory}</span>
                    )}
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
                <p className="text-xl font-bold text-foreground">{businesses?.length ?? 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Businesses</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Personal Info tab ── */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Basic Details" icon={User}>
            <Row label="Full Name" value={user.name} />
            <Row label="Mobile" value={<span className="font-mono">{user.mobile}</span>} />
            <Row label="Email" value={<span className="font-mono">{user.email}</span>} />
            <Row label="Age" value={user.age} />
            <Row label="Gender" value={user.gender} />
            <Row label="Education" value={user.educationLevel} />
            <Row label="Rural / Urban" value={user.ruralUrban} />
            <Row label="Entity Type" value={user.entityType} />
            {user.socialCategory?.length > 0 && (
              <Row label="Social Category" value={user.socialCategory.join(', ')} />
            )}
          </Section>

          <Section title="Profile Flags" icon={ShieldCheck}>
            <BoolRow label="Women Led" value={user.isWomenLed} />
            <BoolRow label="Ex-Serviceman" value={user.isExServiceman} />
            <BoolRow label="Startup" value={user.isStartup} />
            <BoolRow label="Export Oriented" value={user.isExportOriented} />
            <BoolRow label="First-Gen Entrepreneur" value={user.isFirstGenerationEntrepreneur} />
            <BoolRow label="Differently Abled" value={user.differentlyAbled} />
            <BoolRow label="BPL" value={user.bpl} />
            <BoolRow label="Minority" value={user.minority} />
            <BoolRow label="Existing Loan" value={user.hasExistingLoan} />
            <BoolRow label="Loan Defaulter" value={user.isLoanDefaulter} />
            <BoolRow label="Availed Subsidy" value={user.alreadyAvailedSubsidy} />
          </Section>

          <Section title="Employment" icon={Building2}>
            <Row label="Total Employees" value={user.totalEmployees ?? 0} />
            <Row label="Women Employees" value={user.womenEmployees ?? 0} />
            <Row label="PWD Employees" value={user.pwdEmployees ?? 0} />
            {user.annualIncomeLakhs != null && (
              <Row label="Annual Income" value={`₹${user.annualIncomeLakhs} L`} />
            )}
          </Section>

          <Section title="Account" icon={Calendar}>
            <Row label="User ID" value={<span className="font-mono">{user.msmCode || `#${user.id}`}</span>} />
            <Row label="KYC Status" value={<KycPill status={user.kycStatus} />} />
            <Row label="Account Status" value={user.status} />
            <Row label="Registered" value={user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
            <Row label="Last Updated" value={user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          </Section>
        </div>
      )}

      {/* ── Business Info tab ── */}
      {activeTab === 'business' && (
        <div className="space-y-4">
          {!businesses?.length ? (
            <div className="bg-card border border-border rounded-none flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No business profiles found</p>
            </div>
          ) : (
            businesses.map((biz: any, idx: number) => (
              <div key={biz.id} className="bg-card border border-border rounded-none">
                <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-[13px] font-bold text-foreground flex-1">
                    {biz.legalName || biz.tradeName || `Business ${idx + 1}`}
                  </h3>
                  {biz.isPrimary && (
                    <span className={`${PILL} bg-primary/10 text-primary`}>Primary</span>
                  )}
                  {biz.hasPaid && (
                    <span className={`${PILL} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>Paid</span>
                  )}
                </div>
                <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-0">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Identity</p>
                    <Row label="Legal Name" value={biz.legalName} />
                    <Row label="Trade Name" value={biz.tradeName} />
                    <Row label="PAN" value={<span className="font-mono">{biz.pan}</span>} />
                    <Row label="GSTIN" value={<span className="font-mono">{biz.gstin}</span>} />
                    <Row label="Udyam No." value={<span className="font-mono">{biz.udyam}</span>} />
                    <Row label="Constitution" value={biz.constitutionOfBusiness} />
                    <Row label="Registration No." value={biz.registrationNumber} />
                    <Row label="Registration Date" value={biz.registrationDate} />
                    <Row label="GSTIN Status" value={biz.gstinStatus} />
                    <Row label="Taxpayer Type" value={biz.taxpayerType} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Classification</p>
                    <Row label="Business Type" value={biz.businessType} />
                    <Row label="Business Sector" value={biz.businessSector} />
                    <Row label="Enterprise Category" value={biz.enterpriseCategory} />
                    <Row label="Nature of Business" value={biz.natureOfBusiness} />
                    <Row label="Years in Operation" value={biz.yearsInOperation} />
                    <Row label="Business Stage" value={biz.businessStage} />
                    <Row label="Benefit Focus" value={biz.benefitFocus} />

                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 mt-4">Location</p>
                    <Row label="Address" value={biz.principalAddress} />
                    <Row label="City" value={biz.city} />
                    <Row label="District" value={biz.district} />
                    <Row label="State" value={biz.state} />
                    <Row label="Pincode" value={biz.pincode} />
                  </div>
                  <div className="lg:col-span-2 mt-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Financials & Scale</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-10">
                      <div>
                        <Row label="Annual Turnover Range" value={biz.annualTurnoverRange} />
                        <Row label="Annual Turnover (₹L)" value={biz.annualTurnoverLakhs} />
                        <Row label="Investment — Plant/Machinery (₹L)" value={biz.investmentPlantMachineryLakhs} />
                        <Row label="Investment — Equipment (₹L)" value={biz.investmentEquipmentLakhs} />
                      </div>
                      <div>
                        <Row label="Total Employees" value={biz.totalEmployees} />
                        <Row label="Women Employees" value={biz.womenEmployees} />
                        <Row label="PWD Employees" value={biz.pwdEmployees} />
                      </div>
                      <div>
                        <BoolRow label="Startup" value={biz.isStartup} />
                        <BoolRow label="Export Oriented" value={biz.isExportOriented} />
                        <BoolRow label="Women Led" value={biz.isWomenLed} />
                        <BoolRow label="Incorporated" value={biz.isIncorporated} />
                        <BoolRow label="Has Patent" value={biz.hasPatent} />
                        <BoolRow label="Innovation Focused" value={biz.isInnovationFocused} />
                        <BoolRow label="R&D Facility" value={biz.hasRdFacility} />
                        <BoolRow label="Business Plan Ready" value={biz.businessPlanReady} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Cases tab ── */}
      {activeTab === 'cases' && (
        <div className="space-y-3">
          {!cases?.length ? (
            <div className="bg-card border border-border rounded-none flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No cases found for this user</p>
            </div>
          ) : (
            cases.map((c: any) => (
              <div
                key={c.id}
                className="bg-card border border-border rounded-none hover:border-primary/40 transition-colors"
              >
                <div className="px-5 py-4 flex items-start gap-4">
                  {/* Case info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[13px] font-bold text-foreground font-mono">{c.caseNumber}</span>
                      <StatusPill status={c.status} />
                      <PriorityPill priority={c.priority} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.schemeName || c.schemeId || '—'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {c.agent ? (
                        <span className="flex items-center gap-1.5 text-xs text-foreground">
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                            {c.agent.name?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <span className="font-medium">{c.agent.name}</span>
                          <span className="text-muted-foreground font-mono text-[10px]">{c.agent.employeeId}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">Unassigned</span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {c.assignedAt && (
                        <span className="text-xs text-muted-foreground">
                          Assigned {new Date(c.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* View case button */}
                  <Link
                    href={`/admin/dashboard/cases/${c.id}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Case
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

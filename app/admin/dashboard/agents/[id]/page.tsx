'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminAuthApi } from '@/lib/services/api';
import { pincodeService } from '@/lib/pincodeService';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilityCalendar, type AvailabilityLogEntry } from '@/components/calendar/AvailabilityCalendar';
import { Button } from '@/components/ui/button';
import { UnderlineField, fieldLabelClass, fieldWrapperClass, fieldInputClass } from '@/components/ui/underline-field';
import {
  ArrowLeft, User, MapPin, Briefcase, Calendar,
  ShieldCheck, Star, ExternalLink, CalendarDays, BookOpen,
  Plus, Pencil, Save, X, Loader2,
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

  // Availability calendar (view + admin update)
  const [availability, setAvailability] = useState<string>('');
  const [availLog, setAvailLog] = useState<AvailabilityLogEntry[]>([]);
  const [availLogLoading, setAvailLogLoading] = useState(true);

  // Agent detail editing
  const [agentEditing, setAgentEditing] = useState(false);
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentDraft, setAgentDraft] = useState<{
    fullName: string; email: string; phone: string; gender: string;
    region: string; pincode: string;
    expertise: string[]; certifications: string[];
  }>({ fullName: '', email: '', phone: '', gender: '', region: '', pincode: '', expertise: [], certifications: [] });
  const [expertiseInput, setExpertiseInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const pincodeLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Supported schemes editing
  const [schemesEditing, setSchemesEditing] = useState(false);
  const [schemesDraft, setSchemesDraft] = useState<string[]>([]);
  const [schemeInput, setSchemeInput] = useState('');
  const [schemesSaving, setSchemesSaving] = useState(false);
  const [schemeOptions, setSchemeOptions] = useState<{ _id: string; schemeName: string; slug: string }[]>([]);
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
  const [schemeSearching, setSchemeSearching] = useState(false);
  const schemeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    adminAuthApi.getAgentById(id)
      .then((res) => {
        if (res.success) {
          setData(res);
          setAvailability(res.agent?.availability || '');
          setSchemesDraft(res.agent?.supportedSchemes ?? []);
          setAgentDraft({
            fullName: res.agent?.fullName || '',
            email: res.agent?.email || '',
            phone: res.agent?.phone || '',
            gender: res.agent?.gender || '',
            region: res.agent?.region || '',
            pincode: res.agent?.pincode || '',
            expertise: res.agent?.expertise ?? [],
            certifications: res.agent?.certifications ?? [],
          });
        }
      })
      .catch((e: any) => toast.error(e?.message || 'Failed to load agent'))
      .finally(() => setLoading(false));
  }, [id]);

  // Load the agent's AUX availability log for the visible calendar range.
  const loadAvailLog = (from: string, to: string) => {
    if (!id) return;
    setAvailLogLoading(true);
    adminAuthApi.getAgentAvailabilityLog(id, { from, to })
      .then((res) => { if (res.success) setAvailLog(res.log); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load calendar'))
      .finally(() => setAvailLogLoading(false));
  };

  // Admin sets the agent's current availability (also appends a calendar punch).
  const handleSetAvailability = async (status: string) => {
    if (!id) return;
    try {
      const res = await adminAuthApi.updateAgentAvailability(id, status);
      if (res.success) {
        setAvailability(status);
        // Reflect the new punch on the calendar immediately.
        setAvailLog((prev) => [...prev, { id: `live-${Date.now()}`, status, changedAt: new Date().toISOString() }]);
        toast.success(res.message || `Availability set to ${status.replace(/_/g, ' ')}`);
      } else {
        toast.error(res.message || 'Failed to update availability');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update availability');
    }
  };

  const onPincodeChange = (val: string) => {
    const pin = val.replace(/\D/g, '').slice(0, 6);
    setAgentDraft((p) => ({ ...p, pincode: pin }));
    if (pincodeLookupRef.current) clearTimeout(pincodeLookupRef.current);
    if (pin.length < 6) return;
    pincodeLookupRef.current = setTimeout(async () => {
      setPincodeLoading(true);
      try {
        const data = await pincodeService.getPincodeData(pin);
        if (data?.city) {
          setAgentDraft((p) => ({ ...p, region: data.city }));
        }
      } finally {
        setPincodeLoading(false);
      }
    }, 400);
  };

  const saveAgent = async () => {
    if (!id) return;
    setAgentSaving(true);
    try {
      const res = await adminAuthApi.adminUpdateAgent(id, agentDraft);
      if (res.success) {
        setData((prev: any) => ({ ...prev, agent: { ...prev.agent, ...res.agent } }));
        setAgentEditing(false);
        setExpertiseInput('');
        setCertInput('');
        toast.success('Agent details updated');
      } else {
        toast.error(res.message || 'Failed to update');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    } finally {
      setAgentSaving(false);
    }
  };

  const cancelAgentEdit = () => {
    const a = data?.agent;
    setAgentDraft({
      fullName: a?.fullName || '', email: a?.email || '', phone: a?.phone || '',
      gender: a?.gender || '', region: a?.region || '', pincode: a?.pincode || '',
      expertise: a?.expertise ?? [], certifications: a?.certifications ?? [],
    });
    setExpertiseInput('');
    setCertInput('');
    setAgentEditing(false);
  };

  const saveSchemes = async () => {
    if (!id) return;
    setSchemesSaving(true);
    try {
      const res = await adminAuthApi.updateAgentSchemes(id, {
        supportedSchemes: schemesDraft,
      });
      if (res.success) {
        setData((prev: any) => ({
          ...prev,
          agent: { ...prev.agent, supportedSchemes: res.supportedSchemes },
        }));
        setSchemesEditing(false);
        setSchemeInput('');
        toast.success('Supported schemes updated');
      } else {
        toast.error(res.message || 'Failed to update');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    } finally {
      setSchemesSaving(false);
    }
  };

  const cancelSchemesEdit = () => {
    setSchemesEditing(false);
    setSchemeInput('');
    setSchemeOptions([]);
    setSchemeDropdownOpen(false);
    setSchemesDraft(data?.agent?.supportedSchemes ?? []);
  };

  const onSchemeInputChange = (val: string) => {
    setSchemeInput(val);
    setSchemeDropdownOpen(true);
    if (schemeSearchRef.current) clearTimeout(schemeSearchRef.current);
    if (!val.trim()) { setSchemeOptions([]); setSchemeDropdownOpen(false); return; }
    setSchemeSearching(true);
    schemeSearchRef.current = setTimeout(async () => {
      try {
        const res = await adminAuthApi.listAdminSchemes({ search: val.trim(), limit: 8 });
        setSchemeOptions(res.schemes ?? res.data ?? []);
        setSchemeDropdownOpen(true);
      } catch { setSchemeOptions([]); }
      finally { setSchemeSearching(false); }
    }, 250);
  };

  const addScheme = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !schemesDraft.includes(trimmed)) setSchemesDraft((p) => [...p, trimmed]);
    setSchemeInput('');
    setSchemeOptions([]);
    setSchemeDropdownOpen(false);
  };

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

      {/* Grid */}
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Contact & Identity */}
        <div className="bg-card border border-border rounded-none">
          <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground flex-1">Contact &amp; Identity</h3>
            {!agentEditing ? (
              <button onClick={() => setAgentEditing(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors">
                <Pencil className="h-3 w-3" />Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={saveAgent} disabled={agentSaving} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {agentSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {agentSaving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={cancelAgentEdit} disabled={agentSaving} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground transition-colors">
                  <X className="h-3 w-3" />Cancel
                </button>
              </div>
            )}
          </div>
          <div className="px-5 py-4">
            {agentEditing ? (
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                <UnderlineField label="Full Name"   placeholder="Full name"        value={agentDraft.fullName}  onChange={(v) => setAgentDraft((p) => ({ ...p, fullName: v }))} />
                <UnderlineField label="Email"        placeholder="Email address"    value={agentDraft.email}     onChange={(v) => setAgentDraft((p) => ({ ...p, email: v }))} />
                <UnderlineField label="Phone"        placeholder="Phone number"     value={agentDraft.phone}     onChange={(v) => setAgentDraft((p) => ({ ...p, phone: v }))} />
                <UnderlineField label="Gender"       placeholder="e.g. Male / Female" value={agentDraft.gender} onChange={(v) => setAgentDraft((p) => ({ ...p, gender: v }))} />

                {/* Pincode — triggers region auto-fill */}
                <UnderlineField
                  label="Pincode"
                  placeholder="6-digit pincode"
                  value={agentDraft.pincode}
                  onChange={onPincodeChange}
                  inputMode="numeric"
                  rightSlot={pincodeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" /> : undefined}
                />

                {/* Region — auto-filled from pincode */}
                <UnderlineField
                  label="Region (auto-filled from pincode)"
                  placeholder="Auto-filled from pincode"
                  value={agentDraft.region}
                  onChange={(v) => setAgentDraft((p) => ({ ...p, region: v }))}
                />

                {/* Expertise tags */}
                <div className="sm:col-span-2 mt-2">
                  <label className={fieldLabelClass}>Expertise</label>
                  <div className={fieldWrapperClass()}>
                    <input
                      value={expertiseInput}
                      onChange={(e) => setExpertiseInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && expertiseInput.trim()) { e.preventDefault(); const v = expertiseInput.trim(); if (!agentDraft.expertise.includes(v)) setAgentDraft((p) => ({ ...p, expertise: [...p.expertise, v] })); setExpertiseInput(''); } }}
                      placeholder="Type and press Enter to add…"
                      className={fieldInputClass}
                    />
                    <button type="button" onClick={() => { const v = expertiseInput.trim(); if (v && !agentDraft.expertise.includes(v)) setAgentDraft((p) => ({ ...p, expertise: [...p.expertise, v] })); setExpertiseInput(''); }} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-2">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {agentDraft.expertise.map((e) => (
                      <span key={e} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                        {e}<button type="button" onClick={() => setAgentDraft((p) => ({ ...p, expertise: p.expertise.filter((x) => x !== e) }))}><X className="h-2.5 w-2.5 hover:text-destructive" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Certifications tags */}
                <div className="sm:col-span-2 mt-2">
                  <label className={fieldLabelClass}>Certifications</label>
                  <div className={fieldWrapperClass()}>
                    <input
                      value={certInput}
                      onChange={(e) => setCertInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && certInput.trim()) { e.preventDefault(); const v = certInput.trim(); if (!agentDraft.certifications.includes(v)) setAgentDraft((p) => ({ ...p, certifications: [...p.certifications, v] })); setCertInput(''); } }}
                      placeholder="Type and press Enter to add…"
                      className={fieldInputClass}
                    />
                    <button type="button" onClick={() => { const v = certInput.trim(); if (v && !agentDraft.certifications.includes(v)) setAgentDraft((p) => ({ ...p, certifications: [...p.certifications, v] })); setCertInput(''); }} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-2">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {agentDraft.certifications.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                        {c}<button type="button" onClick={() => setAgentDraft((p) => ({ ...p, certifications: p.certifications.filter((x) => x !== c) }))}><X className="h-2.5 w-2.5 hover:text-destructive" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Row label="Full Name"    value={agent.fullName} />
                <Row label="Employee ID"  value={<span className="font-mono">{agent.employeeId}</span>} />
                <Row label="Email"        value={<span className="font-mono">{agent.email}</span>} />
                <Row label="Phone"        value={<span className="font-mono">{agent.phone}</span>} />
                <Row label="Gender"       value={agent.gender} />
                <Row label="Pincode"      value={agent.pincode} />
                <Row label="Region"       value={agent.region} />
                <Row label="Availability" value={agent.availability && <AvailPill availability={agent.availability} />} />
              </>
            )}
          </div>
        </div>

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

        <Section title="Expertise & Skills" icon={Star}>
          {(agentEditing ? agentDraft.expertise : agent.expertise)?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(agentEditing ? agentDraft.expertise : agent.expertise).map((e: string) => (
                <span key={e} className="text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">{e}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic mb-3">No expertise listed</p>
          )}
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 mt-2">Certifications</p>
          {(agentEditing ? agentDraft.certifications : agent.certifications)?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {(agentEditing ? agentDraft.certifications : agent.certifications).map((c: string) => (
                <span key={c} className="text-[11px] font-semibold bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">No certifications listed</p>
          )}
        </Section>

        {/* Supported Schemes + Location */}
        <div className="bg-card border border-border rounded-none lg:col-span-2">
          <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground flex-1">Supported Schemes</h3>
            {!schemesEditing ? (
              <button
                onClick={() => setSchemesEditing(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Pencil className="h-3 w-3" />Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={saveSchemes}
                  disabled={schemesSaving}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {schemesSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {schemesSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={cancelSchemesEdit}
                  disabled={schemesSaving}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />Cancel
                </button>
              </div>
            )}
          </div>
          <div className="px-5 py-4">
            {schemesEditing ? (
              <div className="space-y-4">
                {agent.pincode && (
                  <p className="text-[11px] text-muted-foreground">
                    Location: <span className="font-mono font-semibold text-foreground">{agent.pincode}</span>
                    {agent.city && <span> · {agent.city}</span>}
                    {agent.state && <span>, {agent.state}</span>}
                  </p>
                )}

                {/* Scheme typeahead */}
                <div className="space-y-1.5">
                  <label className={fieldLabelClass}>Supported Schemes</label>
                  <p className="text-[11px] text-muted-foreground -mt-1">Search and select schemes this agent handles. Leave empty to match all schemes.</p>
                  <div className="relative">
                    <div className={fieldWrapperClass()}>
                      <input
                        value={schemeInput}
                        onChange={(e) => onSchemeInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (schemeOptions.length > 0) addScheme(schemeOptions[0].schemeName);
                            else if (schemeInput.trim()) addScheme(schemeInput);
                          }
                          if (e.key === 'Escape') { setSchemeDropdownOpen(false); setSchemeInput(''); }
                        }}
                        onFocus={() => { if (schemeOptions.length > 0) setSchemeDropdownOpen(true); }}
                        onBlur={() => setTimeout(() => setSchemeDropdownOpen(false), 150)}
                        placeholder="Search scheme name…"
                        autoComplete="off"
                        className={fieldInputClass}
                      />
                      {schemeSearching
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0 ml-2" />
                        : schemeInput.trim() && (
                          <button type="button" onClick={() => addScheme(schemeInput)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-2">
                            <Plus className="h-4 w-4" />
                          </button>
                        )
                      }
                    </div>

                    {/* Dropdown */}
                    {schemeDropdownOpen && schemeOptions.length > 0 && (
                      <div className="absolute z-[9999] mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                        {schemeOptions.map((scheme) => {
                          const already = schemesDraft.includes(scheme.schemeName);
                          return (
                            <button
                              key={scheme._id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => addScheme(scheme.schemeName)}
                              disabled={already}
                              className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors
                                ${already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'}`}
                            >
                              <span>
                                <span className="font-medium">{scheme.schemeName}</span>
                                {scheme.slug && scheme.slug !== scheme.schemeName && (
                                  <span className="ml-2 text-[10px] text-muted-foreground font-mono">{scheme.slug}</span>
                                )}
                              </span>
                              {already && <span className="text-[10px] text-muted-foreground shrink-0">Already added</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {schemesDraft.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {schemesDraft.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                          {s}
                          <button type="button" onClick={() => setSchemesDraft((p) => p.filter((x) => x !== s))} className="hover:text-destructive transition-colors ml-0.5">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {schemesDraft.length === 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">No schemes added — agent will be eligible for all scheme cases.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {agent.pincode && (
                  <p className="text-[11px] text-muted-foreground">
                    Location: <span className="font-mono font-semibold text-foreground">{agent.pincode}</span>
                    {agent.city && <span> · {agent.city}</span>}
                    {agent.state && <span>, {agent.state}</span>}
                  </p>
                )}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Supported Schemes</p>
                  {agent.supportedSchemes?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.supportedSchemes.map((s: string) => (
                        <span key={s} className="text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">{s}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic">No schemes specified — eligible for all scheme cases</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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

      {/* Availability calendar — view history + update current status */}
      <Section title="Availability Calendar" icon={CalendarDays}>
        <AvailabilityCalendar
          log={availLog}
          loading={availLogLoading}
          onRangeChange={loadAvailLog}
          currentAvailability={availability}
          onSetAvailability={handleSetAvailability}
        />
      </Section>
    </div>
  );
}

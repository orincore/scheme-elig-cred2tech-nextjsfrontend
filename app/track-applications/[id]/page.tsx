'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { casesApi, API_BASE_URL } from '@/lib/services/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  AlertCircle,
  User,
  Package,
  Upload,
  Loader2,
  Download,
  RefreshCw,
  FilePlus,
  Hash,
  Briefcase,
  CreditCard,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CaseDetails {
  id: string;
  caseNumber: string;
  case_number?: string;
  msmeName?: string;
  msmeBusinessName?: string;
  msmeEmail?: string;
  msme_email?: string;
  msmeMobile?: string;
  msmePhone?: string;
  msme_mobile?: string;
  msmeCity?: string;
  principal_city?: string;
  msmeState?: string;
  principal_state?: string;
  msmeAddress?: string;
  principal_address?: string;
  msmeBusinessType?: string;
  business_type?: string;
  msmeBusinessSector?: string;
  business_sector?: string;
  schemeName?: string;
  scheme_name?: string;
  schemeId?: string;
  status: string;
  priority: string;
  assignedAgentName?: string;
  assignedAgentEmail?: string;
  assignedAgentPhone?: string;
  assignedAt?: string;
  assigned_at?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  closedAt?: string;
  closureReason?: string;
  closureNotes?: string;
  msmeNotes?: string;
  agentNotes?: string;
  adminNotes?: string;
  pan_number?: string;
  gstin?: string;
  principal_pincode?: string;
  registration_date?: string;
  annual_turnover_range?: string;
  total_employees?: string;
  legal_name_of_business?: string;
  trade_name_of_business?: string;
  agent?: {
    fullName: string;
    email?: string;
    phone?: string;
  };
  schemeDetails?: {
    name?: string;
    description?: string;
    eligibility?: string[];
    benefits?: string[];
    documents_required?: string[];
  };
  timeline?: Array<{
    id: string;
    action: string;
    performedBy: string;
    performedByType?: string;
    timestamp: string;
    notes?: string;
    oldValue?: any;
    newValue?: any;
  }>;
}

interface DocumentRequest {
  id: string;
  case_id: string;
  case_number?: string;
  document_name: string;
  description?: string;
  status: 'PENDING' | 'UPLOADED' | 'CANCELLED';
  requested_at: string;
  fulfilled_at?: string;
  agent_name?: string;
  file_url?: string;
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  NEW:               { label: 'New',          cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  ASSIGNED:          { label: 'Assigned',     cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  IN_PROGRESS:       { label: 'In Progress',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  PENDING_DOCS:      { label: 'Docs Pending', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  DOCUMENTS_PENDING: { label: 'Docs Pending', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  UNDER_REVIEW:      { label: 'Under Review', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  APPROVED:          { label: 'Approved',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  CLOSED:            { label: 'Closed',       cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED:          { label: 'Rejected',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  ESCALATED:         { label: 'Escalated',    cls: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
};

const PRIORITY_CFG: Record<string, { cls: string }> = {
  HIGH:   { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  MEDIUM: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  LOW:    { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  URGENT: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const DOC_STATUS_CFG: Record<string, string> = {
  PENDING:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  UPLOADED:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const TIMELINE_DOT: Record<string, string> = {
  CASE_CREATED:       'bg-blue-500',
  ASSIGNED:           'bg-purple-500',
  STATUS_CHANGED:     'bg-amber-500',
  NOTE_ADDED:         'bg-gray-400',
  DOCUMENT_REQUESTED: 'bg-orange-500',
  DOCUMENT_UPLOADED:  'bg-green-500',
  CASE_CLOSED:        'bg-green-600',
  CASE_REJECTED:      'bg-red-500',
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status.replace(/_/g, ' '), cls: 'bg-muted text-muted-foreground' };
  return <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
}

function PriorityPill({ priority }: { priority: string }) {
  const cfg = PRIORITY_CFG[priority] ?? { cls: 'bg-muted text-muted-foreground' };
  return <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>{priority}</span>;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1">{value}</span>
    </div>
  );
}

function SectionBox({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

function formatAction(action: string): string {
  return action.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MsmeCaseDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const { userId, authStep } = useMsmeAuth();
  const caseId  = params.id as string;

  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [reqsLoading, setReqsLoading] = useState(false);

  const [uploadOpen, setUploadOpen]     = useState(false);
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [activeRequest, setActiveRequest] = useState<DocumentRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchCaseDetails = async () => {
    if (!caseId || !userId) return;
    try {
      const res = await casesApi.getMsmeCaseDetails(caseId, parseInt(userId));
      if (res.success) {
        const timeline = (res.history ?? []).map((h: any) => ({
          id:              String(h.id),
          action:          h.action,
          performedBy:     h.performedBy ?? h.performed_by_name ?? 'System',
          performedByType: h.performedByType ?? h.performed_by_type,
          timestamp:       h.createdAt ?? h.created_at ?? h.timestamp,
          notes:           h.notes ?? undefined,
          oldValue:        h.oldValue ?? h.old_value,
          newValue:        h.newValue ?? h.new_value,
        }));
        setCaseDetails({ ...res.case, timeline, schemeDetails: res.schemeDetails });
      } else {
        setError('Failed to load case details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load case details');
    }
  };

  const fetchDocumentRequests = async () => {
    if (!userId) return;
    setReqsLoading(true);
    try {
      const res = await casesApi.getMsmeDocumentRequests(parseInt(userId));
      if (res.success) {
        setDocRequests(
          (res.requests || []).filter((r: DocumentRequest) => String(r.case_id) === String(caseId))
        );
      }
    } catch (err: any) {
      console.error('Failed to load document requests:', err.message);
    } finally {
      setReqsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!userId) { setIsLoading(false); return; }
      await Promise.all([fetchCaseDetails(), fetchDocumentRequests()]);
      setIsLoading(false);
    };
    if (authStep === 'authenticated') load();
  }, [authStep, userId, caseId]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!uploadFile || !activeRequest || !userId) { toast.error('Please select a file'); return; }
    setUploading(true);
    try {
      await casesApi.fulfillDocumentRequest(activeRequest.id, parseInt(userId), uploadFile);
      toast.success(`"${uploadFile.name}" uploaded successfully`);
      setUploadOpen(false);
      setUploadFile(null);
      setActiveRequest(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await Promise.all([fetchDocumentRequests(), fetchCaseDetails()]);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const openUploadDialog = (req: DocumentRequest) => {
    setActiveRequest(req);
    setUploadFile(null);
    setUploadOpen(true);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-5">
          <div className="border-b-2 border-border pb-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-56" />
            <div className="flex gap-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !caseDetails) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-1">Error Loading Case</h2>
          <p className="text-sm text-muted-foreground mb-6">{error || 'Case not found'}</p>
          <Link href="/track-applications">
            <Button size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // ── Derive display values ──────────────────────────────────────────────────

  const caseNumber  = caseDetails.caseNumber || caseDetails.case_number || '—';
  const schemeName  = caseDetails.schemeName || caseDetails.scheme_name || caseDetails.schemeId || '—';
  const bizName     = caseDetails.msmeBusinessName || caseDetails.msmeName || '—';
  const agentName   = caseDetails.agent?.fullName || caseDetails.assignedAgentName;
  const agentEmail  = caseDetails.agent?.email    || caseDetails.assignedAgentEmail;
  const agentPhone  = caseDetails.agent?.phone    || caseDetails.assignedAgentPhone;
  const email       = caseDetails.msmeEmail  || caseDetails.msme_email;
  const phone       = caseDetails.msmeMobile || caseDetails.msmePhone || caseDetails.msme_mobile;
  const city        = caseDetails.msmeCity        || caseDetails.principal_city;
  const state       = caseDetails.msmeState       || caseDetails.principal_state;
  const address     = caseDetails.msmeAddress     || caseDetails.principal_address;
  const bizType     = caseDetails.msmeBusinessType  || caseDetails.business_type;
  const bizSector   = caseDetails.msmeBusinessSector || caseDetails.business_sector;
  const legalName   = caseDetails.legal_name_of_business;
  const tradeName   = caseDetails.trade_name_of_business;
  const appliedDate = caseDetails.createdAt ? new Date(caseDetails.createdAt).toLocaleDateString() : '—';
  const updatedDate = caseDetails.updatedAt ? new Date(caseDetails.updatedAt).toLocaleDateString() : '—';

  const pendingRequests = docRequests.filter((r) => r.status === 'PENDING');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* ─── Page Header ────────────────────────────────────────────────── */}
        <div className="border-b-2 border-border pb-5">
          <Link
            href="/track-applications"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Applications
          </Link>

          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1">
            Case Details
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground font-mono">
                {caseNumber}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{schemeName}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={caseDetails.status} />
              {pendingRequests.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-full">
                  <AlertCircle className="h-3 w-3" />
                  {pendingRequests.length} doc{pendingRequests.length > 1 ? 's' : ''} needed
                </span>
              )}
              {caseDetails.schemeId && (
                <button
                  onClick={() => router.push(`/scheme/${caseDetails.schemeId}`)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <Package className="h-3 w-3" />
                  View Scheme
                </button>
              )}
            </div>
          </div>

          {/* Inline stats */}
          <div className="flex items-center gap-5 mt-5 flex-wrap">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Applied</p>
              <p className="text-base font-bold text-foreground">{appliedDate}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Last Updated</p>
              <p className="text-base font-bold text-foreground">{updatedDate}</p>
            </div>
            {caseDetails.closedAt && (
              <>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Closed</p>
                  <p className="text-base font-bold text-foreground">
                    {new Date(caseDetails.closedAt).toLocaleDateString()}
                  </p>
                </div>
              </>
            )}
            {agentName && (
              <>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Agent</p>
                  <p className="text-base font-bold text-foreground">{agentName}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Pending docs action banner ──────────────────────────────────── */}
        {pendingRequests.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/60 rounded-none p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                Action Required — Your agent has requested {pendingRequests.length} document{pendingRequests.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between bg-white dark:bg-card border border-orange-100 dark:border-orange-900/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FilePlus className="h-4 w-4 text-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{req.document_name}</p>
                      {req.description && <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>}
                      <p className="text-xs text-muted-foreground">
                        {req.agent_name ? `Requested by ${req.agent_name} · ` : ''}
                        {new Date(req.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white shrink-0 ml-4"
                    onClick={() => openUploadDialog(req)}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Two-column layout: case info + business/agent ───────────────── */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* Case & Scheme info */}
          <SectionBox title="Case & Scheme" icon={Package}>
            <InfoRow label="Case Number" value={caseNumber} />
            <InfoRow label="Scheme" value={schemeName} />
            <InfoRow label="Status" value={STATUS_CFG[caseDetails.status]?.label ?? caseDetails.status} />
            <InfoRow label="Applied On" value={appliedDate} />
            <InfoRow label="Last Updated" value={updatedDate} />
            {caseDetails.closedAt && (
              <InfoRow label="Closed On" value={new Date(caseDetails.closedAt).toLocaleDateString()} />
            )}
            {caseDetails.closureReason && (
              <InfoRow label="Closure Reason" value={caseDetails.closureReason} />
            )}
            {caseDetails.closureNotes && (
              <InfoRow label="Closure Notes" value={caseDetails.closureNotes} />
            )}
          </SectionBox>

          {/* Agent info */}
          <SectionBox title="Assigned Agent" icon={User}>
            {agentName ? (
              <>
                <InfoRow label="Name" value={agentName} />
                <InfoRow label="Email" value={agentEmail} />
                <InfoRow label="Phone" value={agentPhone} />
              </>
            ) : (
              <div className="py-6 text-center">
                <User className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No agent assigned yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">You will be notified when one is assigned</p>
              </div>
            )}
          </SectionBox>
        </div>

        {/* ─── Business / MSME info ─────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* Contact */}
          <SectionBox title="Contact Information" icon={Building2}>
            <InfoRow label="Business Name"  value={bizName} />
            <InfoRow label="Legal Name"     value={legalName} />
            <InfoRow label="Trade Name"     value={tradeName} />
            <InfoRow label="Email"          value={email} />
            <InfoRow label="Phone"          value={phone} />
            <InfoRow label="City"           value={city} />
            <InfoRow label="State"          value={state} />
            <InfoRow label="Address"        value={address} />
            <InfoRow label="Pincode"        value={caseDetails.principal_pincode} />
          </SectionBox>

          {/* Business details */}
          <SectionBox title="Business Details" icon={Briefcase}>
            <InfoRow label="Business Type"   value={bizType} />
            <InfoRow label="Business Sector" value={bizSector} />
            <InfoRow label="PAN"             value={caseDetails.pan_number} />
            <InfoRow label="GSTIN"           value={caseDetails.gstin} />
            <InfoRow label="Reg. Date"       value={caseDetails.registration_date ? new Date(caseDetails.registration_date).toLocaleDateString() : undefined} />
            <InfoRow label="Annual Turnover" value={caseDetails.annual_turnover_range} />
            <InfoRow label="Employees"       value={caseDetails.total_employees?.toString()} />
          </SectionBox>
        </div>

        {/* ─── Notes from agent / admin ────────────────────────────────────── */}
        {(caseDetails.agentNotes || caseDetails.msmeNotes) && (
          <SectionBox title="Notes" icon={FileText}>
            {caseDetails.agentNotes && (
              <div className="py-2.5 border-b border-border last:border-0">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-1">From Agent</p>
                <p className="text-sm text-foreground">{caseDetails.agentNotes}</p>
              </div>
            )}
            {caseDetails.msmeNotes && (
              <div className="py-2.5 border-b border-border last:border-0">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-1">Your Notes</p>
                <p className="text-sm text-foreground">{caseDetails.msmeNotes}</p>
              </div>
            )}
          </SectionBox>
        )}

        {/* ─── Scheme details ───────────────────────────────────────────────── */}
        {caseDetails.schemeDetails && (caseDetails.schemeDetails.description || (caseDetails.schemeDetails.benefits?.length ?? 0) > 0 || (caseDetails.schemeDetails.documents_required?.length ?? 0) > 0) && (
          <SectionBox title="Scheme Details" icon={Package}>
            {caseDetails.schemeDetails.description && (
              <div className="py-2.5 border-b border-border">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-1">Description</p>
                <p className="text-sm text-foreground">{caseDetails.schemeDetails.description}</p>
              </div>
            )}
            {(caseDetails.schemeDetails.benefits?.length ?? 0) > 0 && (
              <div className="py-2.5 border-b border-border">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-2">Benefits</p>
                <ul className="space-y-1">
                  {caseDetails.schemeDetails!.benefits!.map((b, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-primary mt-0.5">·</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(caseDetails.schemeDetails.documents_required?.length ?? 0) > 0 && (
              <div className="py-2.5">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-2">Required Documents</p>
                <ul className="space-y-1">
                  {caseDetails.schemeDetails!.documents_required!.map((d, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-primary mt-0.5">·</span>{d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionBox>
        )}

        {/* ─── Document Requests Table ──────────────────────────────────────── */}
        {docRequests.length > 0 && (
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                  <FilePlus className="h-4 w-4 text-muted-foreground" />
                  Document Requests
                  {pendingRequests.length > 0 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-full">
                      {pendingRequests.length} pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Documents requested by your agent for this case</p>
              </div>
              <button
                disabled={reqsLoading}
                onClick={fetchDocumentRequests}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reqsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="overflow-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                  <tr className="bg-background border-b-2 border-border">
                    {['Document', 'Status', 'Requested', 'Action'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docRequests.map((req) => (
                    <tr key={req.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-foreground">{req.document_name}</p>
                        {req.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[280px]">{req.description}</p>
                        )}
                        {req.agent_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">By {req.agent_name}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_STATUS_CFG[req.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-foreground">{new Date(req.requested_at).toLocaleDateString()}</p>
                        {req.fulfilled_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Uploaded {new Date(req.fulfilled_at).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => openUploadDialog(req)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                          >
                            <Upload className="h-3 w-3" />
                            Upload
                          </button>
                        )}
                        {req.status === 'UPLOADED' && req.file_url && (
                          <a
                            href={`${API_BASE_URL}${req.file_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-foreground bg-muted/30 hover:bg-muted/60 transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            View File
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Timeline ─────────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Case Timeline
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Full history of actions on this case</p>
          </div>

          <div className="px-5 py-4">
            {caseDetails.timeline && caseDetails.timeline.length > 0 ? (
              <div className="space-y-0">
                {caseDetails.timeline.map((item, index) => {
                  const dotColor = TIMELINE_DOT[item.action] ?? 'bg-muted-foreground/40';
                  const isLast   = index === caseDetails.timeline!.length - 1;
                  return (
                    <div key={item.id} className="flex gap-4">
                      {/* Dot + connector */}
                      <div className="flex flex-col items-center pt-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                        {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[24px]" />}
                      </div>
                      {/* Content */}
                      <div className={`flex-1 pb-5 ${isLast ? '' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{formatAction(item.action)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">by {item.performedBy || 'System'}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                          </span>
                        </div>
                        {item.action === 'STATUS_CHANGED' && item.newValue && (
                          <div className="mt-1.5">
                            <span className="text-xs text-muted-foreground">New status: </span>
                            <span className="text-xs font-semibold text-foreground">
                              {typeof item.newValue === 'object'
                                ? (item.newValue.status || item.newValue.newStatus || JSON.stringify(item.newValue))
                                : String(item.newValue)}
                            </span>
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-xs text-foreground/70 mt-1.5 bg-muted/40 rounded px-2.5 py-1.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No timeline events yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Upload Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!uploading) {
            setUploadOpen(open);
            if (!open) { setUploadFile(null); setActiveRequest(null); }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Requested Document
            </DialogTitle>
            <DialogDescription>
              {activeRequest && (
                <>
                  Your agent has requested: <strong>{activeRequest.document_name}</strong>.
                  {activeRequest.description && (
                    <span className="block mt-1 text-sm text-muted-foreground">{activeRequest.description}</span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="detail-file-upload">Select File</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPEG, PNG, WebP, Word · Max 10 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="detail-file-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading} className="gap-2">
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
                : <><Upload className="h-4 w-4" />Submit Document</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

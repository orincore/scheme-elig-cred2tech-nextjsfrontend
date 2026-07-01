'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { casesApi, API_BASE_URL } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { RequestDocumentsDialog } from '@/components/cases/RequestDocumentsDialog';
import { meetingPlatformLabel, formatMeetingDateTime, CaseMeeting } from '@/lib/meetingUtils';
import { AgreementCard, AgreementInfo } from '@/components/cases/AgreementCard';
import { SignAgreementDialog } from '@/components/cases/SignAgreementDialog';
import { PaymentRequestDialog } from '@/components/cases/PaymentRequestDialog';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Package,
  ExternalLink,
  Upload,
  Loader2,
  Download,
  MessageSquare,
  RefreshCw,
  FilePlus,
  Inbox,
  Link as LinkIcon,
  IndianRupee,
} from 'lucide-react';
import Link from 'next/link';
import { DocumentViewer } from '@/components/ui/document-viewer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaseDetails {
  id: string;
  caseNumber: string;
  case_number?: string;
  businessName: string;
  msme_name?: string;
  msmeName?: string;
  status: string;
  scheme: string;
  scheme_name?: string;
  schemeName?: string;
  schemeId?: string;
  assignedAt: string;
  assigned_at?: string;
  priority: string;
  msme_email?: string;
  msmeEmail?: string;
  msme_mobile?: string;
  msmeMobile?: string;
  legal_name_of_business?: string;
  trade_name_of_business?: string;
  principal_city?: string;
  msmeCity?: string;
  principal_state?: string;
  msmeState?: string;
  business_type?: string;
  msmeBusinessType?: string;
  business_sector?: string;
  msmeBusinessSector?: string;
  pan_number?: string;
  gstin?: string;
  principal_address?: string;
  principal_pincode?: string;
  registration_date?: string;
  annual_turnover_range?: string;
  total_employees?: string;
  msmeDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    pincode?: string;
    city?: string;
    principal_city?: string;
    state?: string;
    principal_state?: string;
    pan?: string;
    pan_number?: string;
    gst?: string;
    legal_name_of_business?: string;
    trade_name_of_business?: string;
    business_type?: string;
    business_sector?: string;
    registration_date?: string;
    annual_turnover?: string;
    employee_count?: string;
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

interface CaseDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  presigned_url?: string;
  document_tag: string;
  uploaded_at: string;
}

interface DocumentRequest {
  id: string;
  document_name: string;
  description?: string;
  status: 'PENDING' | 'UPLOADED' | 'CANCELLED';
  requested_at: string;
  fulfilled_at?: string;
  file_url?: string;
  presigned_url?: string;
  uploaded_file_name?: string;
}

interface PaymentRequest {
  id: string | number;
  category: string;
  customTitle?: string | null;
  title: string;
  reason: string;
  requestedAmount: number;
  approvedAmount: number | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string | null;
  createdAt: string;
}

const PAYMENT_REQUEST_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: { label: 'Pending Approval', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  APPROVED:          { label: 'Approved',         cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED:          { label: 'Rejected',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  PAID:              { label: 'Paid',             cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

const CASE_STATUSES = [
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DOCUMENTS_PENDING', label: 'Documents Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ESCALATED', label: 'Escalated' },
];

const CONTACT_METHODS = ['Phone', 'Email', 'WhatsApp', 'In-Person', 'Video Call'];

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
  ESCALATED:         { label: 'Escalated',    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
};
const PRIORITY_CFG: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  LOW:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};
const REQ_CFG: Record<string, string> = {
  PENDING:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  UPLOADED:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-muted text-muted-foreground',
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status?.replace(/_/g, ' ') || '—', cls: 'bg-muted text-muted-foreground' };
  return <span className={`${PILL} ${cfg.cls}`}>{cfg.label}</span>;
}

function InfoRow({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[130px] shrink-0 pt-0.5">{label}</span>
      <span className={`text-[13px] text-foreground flex-1 ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-muted-foreground/40">—</span>}
      </span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, action }: { icon: any; title: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-[13px] font-bold text-foreground flex-1">{title}</h3>
      {action}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAction(action: string): string {
  return action.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const { agent } = useAgentAuth();
  const caseId  = params.id as string;


  // ── Core state ──────────────────────────────────────────────────────────────
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // ── Documents state ──────────────────────────────────────────────────────────
  const [documents, setDocuments]     = useState<CaseDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // ── Document requests state ──────────────────────────────────────────────────
  const [docRequests, setDocRequests]         = useState<DocumentRequest[]>([]);
  const [reqsLoading, setReqsLoading]         = useState(false);

  // ── Upload-document dialog ───────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen]   = useState(false);
  const [uploadFile, setUploadFile]   = useState<File | null>(null);
  const [uploadTag, setUploadTag]     = useState('');
  const [uploading, setUploading]     = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // ── Update-status dialog ────────────────────────────────────────────────────
  const [statusOpen, setStatusOpen]         = useState(false);
  const [newStatus, setNewStatus]           = useState('');
  const [statusNotes, setStatusNotes]       = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ── Contact-MSME dialog ──────────────────────────────────────────────────────
  const [contactOpen, setContactOpen]       = useState(false);
  const [contactMethod, setContactMethod]   = useState('Phone');
  const [contactNotes, setContactNotes]     = useState('');
  const [loggingContact, setLoggingContact] = useState(false);

  // ── Request-document dialog ──────────────────────────────────────────────────
  const [reqDocOpen, setReqDocOpen]           = useState(false);

  // ── Document viewer overlay ──────────────────────────────────────────────────
  const [viewerUrl, setViewerUrl]   = useState<string | null>(null);
  const [viewerName, setViewerName] = useState<string>('');

  // ── Meetings (read-only — scheduling is admin-only) ──────────────────────────
  const [meetings, setMeetings]         = useState<CaseMeeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const upcomingMeeting = meetings.find((m) => m.status === 'SCHEDULED') || null;

  // ── Service agreement ─────────────────────────────────────────────────────────
  const [agreement, setAgreement] = useState<AgreementInfo | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [signAgreementOpen, setSignAgreementOpen] = useState(false);

  // ── Payment requests ───────────────────────────────────────────────────────────
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentRequestsLoading, setPaymentRequestsLoading] = useState(false);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);

  // ── Fetch case details ───────────────────────────────────────────────────────
  const fetchCaseDetails = async (showSpinner = false) => {
    if (!caseId || !agent) return;
    if (showSpinner) setIsLoading(true);
    try {
      const res = await casesApi.getAgentCaseDetails(caseId);
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
        setCaseDetails({ ...res.case, timeline });
      } else {
        setError('Failed to load case details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load case details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, agent]);

  // ── Fetch documents — only needs caseId (JWT token is already in localStorage) ─
  const fetchDocuments = async () => {
    if (!caseId) return;
    setDocsLoading(true);
    try {
      const res = await casesApi.getCaseDocuments(caseId);
      if (res.success) setDocuments(res.documents || []);
    } catch (err: any) {
      console.error('Failed to load documents:', err.message || err);
    } finally {
      setDocsLoading(false);
    }
  };

  // ── Fetch document requests ──────────────────────────────────────────────────
  const fetchDocumentRequests = async () => {
    if (!caseId) return;
    setReqsLoading(true);
    try {
      const res = await casesApi.getDocumentRequests(caseId);
      if (res.success) setDocRequests(res.requests || []);
    } catch (err: any) {
      console.error('Failed to load document requests:', err.message || err);
    } finally {
      setReqsLoading(false);
    }
  };

  // ── Fetch meetings (read-only) ───────────────────────────────────────────────
  const fetchMeetings = async () => {
    if (!caseId) return;
    setMeetingsLoading(true);
    try {
      const res = await casesApi.getAgentCaseMeetings(caseId);
      if (res.success) setMeetings(res.meetings || []);
    } catch (err: any) {
      console.error('Failed to load meetings:', err.message || err);
    } finally {
      setMeetingsLoading(false);
    }
  };

  // ── Fetch agreement ───────────────────────────────────────────────────────────
  const fetchAgreement = async () => {
    if (!caseId) return;
    setAgreementLoading(true);
    try {
      const res = await casesApi.getAgentAgreement(caseId);
      if (res.success) setAgreement(res.agreement || null);
    } catch (err: any) {
      console.error('Failed to load agreement:', err.message || err);
    } finally {
      setAgreementLoading(false);
    }
  };

  const handleViewAgreement = async () => {
    try {
      const res = await casesApi.getAgentAgreementUrl(caseId);
      if (!res.success || !res.fileUrl) {
        toast.error('Agreement is temporarily unavailable. Please try again.');
        return;
      }
      setViewerUrl(res.fileUrl);
      setViewerName(agreement?.originalFileName || 'Service Agreement.pdf');
    } catch (err: any) {
      toast.error(err.message || 'Agreement is temporarily unavailable.');
    }
  };

  const handleRequestSignOtp = (method: 'email' | 'mobile') => casesApi.requestSignOtpAsAgent(caseId, method);
  const handleSignAgreement = (fullName: string, otp: string, otpMethod: 'email' | 'mobile') =>
    casesApi.signAgreementAsAgent(caseId, fullName, otp, otpMethod);

  // ── Fetch payment requests ────────────────────────────────────────────────────
  const fetchPaymentRequests = async () => {
    if (!caseId) return;
    setPaymentRequestsLoading(true);
    try {
      const res = await casesApi.getAgentPaymentRequests(caseId);
      if (res.success) setPaymentRequests(res.paymentRequests || []);
    } catch (err: any) {
      console.error('Failed to load payment requests:', err.message || err);
    } finally {
      setPaymentRequestsLoading(false);
    }
  };

  const handleCreatePaymentRequest = (dto: { category: string; customTitle?: string; reason: string; amount: number }) =>
    casesApi.createPaymentRequest(caseId, dto);

  // Fire both independently of agent context — JWT in localStorage handles auth
  useEffect(() => {
    if (!caseId) return;
    fetchDocuments();
    fetchDocumentRequests();
    fetchMeetings();
    fetchAgreement();
    fetchPaymentRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // ── Upload handler ───────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Please select a file'); return; }
    setUploading(true);
    try {
      await casesApi.uploadCaseDocument(caseId, uploadFile, uploadTag || undefined);
      toast.success(`"${uploadFile.name}" uploaded successfully`);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTag('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Status update handler ────────────────────────────────────────────────────
  const handleStatusUpdate = async () => {
    if (!newStatus) { toast.error('Please select a status'); return; }
    setUpdatingStatus(true);
    try {
      const res = await casesApi.updateCaseStatus(caseId, newStatus, statusNotes || undefined);
      if (res.success) {
        toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
        setStatusOpen(false);
        setNewStatus('');
        setStatusNotes('');
        await fetchCaseDetails();
      } else {
        toast.error('Failed to update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Contact log handler ──────────────────────────────────────────────────────
  const handleLogContact = async () => {
    setLoggingContact(true);
    try {
      const res = await casesApi.logContactMSME(caseId, contactMethod, contactNotes || undefined);
      if (res.success) {
        toast.success(`Contact via ${contactMethod} logged`);
        setContactOpen(false);
        setContactNotes('');
        setContactMethod('Phone');
        await fetchCaseDetails();
      } else {
        toast.error('Failed to log contact');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to log contact');
    } finally {
      setLoggingContact(false);
    }
  };

  // ── Open document in viewer (images) or new tab (PDFs / others) ─────────────
  const openDocument = async (opts: {
    id?: string;
    type?: 'doc' | 'req';
    file_url: string;
    file_name: string;
    presigned_url?: string | null;
  }) => {
    let url: string | null = opts.presigned_url ?? null;

    if (!url && opts.id) {
      try {
        const res = opts.type === 'req'
          ? await casesApi.getDocumentRequestUrl(caseId, opts.id)
          : await casesApi.getDocumentUrl(caseId, opts.id);
        url = res?.fileUrl ?? null;
      } catch { /* fall through to error */ }
    }

    if (!url) {
      toast.error('Document is temporarily unavailable. Please refresh and try again.');
      return;
    }

    setViewerUrl(url);
    setViewerName(opts.file_name);
  };

  // ── Request documents (multiple) ─────────────────────────────────────────────
  const refreshAfterDocRequests = async () => {
    await fetchDocumentRequests();
    await fetchCaseDetails();
  };

  // ── Loading / error ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80" />
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-36 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error || !caseDetails) {
    return (
      <div className="space-y-4">
        <Link href="/agent/dashboard/cases" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to Cases
        </Link>
        <div className="bg-card border border-border rounded-none flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">Failed to load case</p>
          <p className="text-xs text-muted-foreground">{error || 'Case not found'}</p>
        </div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const caseNumber   = caseDetails.caseNumber || caseDetails.case_number;
  const businessName = caseDetails.businessName || caseDetails.msme_name || caseDetails.msmeName;
  const scheme       = caseDetails.scheme || caseDetails.scheme_name || caseDetails.schemeName || caseDetails.schemeId;
  const assignedAt   = caseDetails.assignedAt || caseDetails.assigned_at;

  const msme = {
    name:      caseDetails.msmeDetails?.name      || caseDetails.msmeName   || businessName,
    email:     caseDetails.msmeDetails?.email     || caseDetails.msme_email  || caseDetails.msmeEmail,
    phone:     caseDetails.msmeDetails?.phone     || caseDetails.msme_mobile || caseDetails.msmeMobile,
    address:   caseDetails.msmeDetails?.address   || caseDetails.principal_address,
    pincode:   caseDetails.msmeDetails?.pincode   || caseDetails.principal_pincode,
    city:      caseDetails.msmeDetails?.city      || caseDetails.msmeDetails?.principal_city  || caseDetails.principal_city  || caseDetails.msmeCity,
    state:     caseDetails.msmeDetails?.state     || caseDetails.msmeDetails?.principal_state || caseDetails.principal_state || caseDetails.msmeState,
    pan:       caseDetails.msmeDetails?.pan       || caseDetails.msmeDetails?.pan_number || caseDetails.pan_number,
    gst:       caseDetails.msmeDetails?.gst       || caseDetails.gstin,
    legalName: caseDetails.msmeDetails?.legal_name_of_business  || caseDetails.legal_name_of_business,
    tradeName: caseDetails.msmeDetails?.trade_name_of_business  || caseDetails.trade_name_of_business,
    bizType:   caseDetails.msmeDetails?.business_type   || caseDetails.business_type  || caseDetails.msmeBusinessType,
    bizSector: caseDetails.msmeDetails?.business_sector || caseDetails.business_sector || caseDetails.msmeBusinessSector,
    regDate:   caseDetails.msmeDetails?.registration_date || caseDetails.registration_date,
    turnover:  caseDetails.msmeDetails?.annual_turnover  || caseDetails.annual_turnover_range,
    employees: caseDetails.msmeDetails?.employee_count   || caseDetails.total_employees,
  };

  const pendingRequests = docRequests.filter((r) => r.status === 'PENDING').length;
  const actionBtn = 'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors';

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <Link href="/agent/dashboard/cases" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />Back to Cases
        </Link>

        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Case Detail</p>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground font-mono">{caseNumber}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusPill status={caseDetails.status} />
              {caseDetails.priority && (
                <span className={`${PILL} ${PRIORITY_CFG[caseDetails.priority] ?? 'bg-muted text-muted-foreground'}`}>{caseDetails.priority}</span>
              )}
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground truncate max-w-[260px]">{scheme}</span>
            </div>
          </div>

          {/* Action toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button className={actionBtn} onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5" />Upload Doc
            </button>
            <button className={actionBtn} onClick={() => setReqDocOpen(true)}>
              <FilePlus className="h-3.5 w-3.5" />Request Doc
            </button>
            <button className={actionBtn} onClick={() => { setNewStatus(caseDetails.status); setStatusOpen(true); }}>
              <CheckCircle className="h-3.5 w-3.5" />Update Status
            </button>
            <button className={actionBtn} onClick={() => setContactOpen(true)}>
              <MessageSquare className="h-3.5 w-3.5" />Contact MSME
            </button>
            <button className={actionBtn} onClick={() => { fetchCaseDetails(); fetchDocuments(); fetchDocumentRequests(); }}>
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </button>
          </div>
        </div>

        {/* Quick-stats strip */}
        <div className="flex items-center gap-5 mt-5 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Assigned</p>
            <p className="text-sm font-semibold text-foreground">{assignedAt ? new Date(assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Documents</p>
            <p className="text-sm font-semibold text-foreground">{documents.length}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Pending Requests</p>
            <p className={`text-sm font-semibold ${pendingRequests > 0 ? 'text-orange-500' : 'text-foreground'}`}>{pendingRequests}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Timeline</p>
            <p className="text-sm font-semibold text-foreground">{caseDetails.timeline?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-4">

          {/* MSME Info */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader icon={Building2} title="MSME Information" />
            <div className="px-5 py-4 grid sm:grid-cols-2 gap-x-8">
              <div>
                <InfoRow label="Name"         value={msme.name} />
                <InfoRow label="Legal Name"   value={msme.legalName} />
                <InfoRow label="Trade Name"   value={msme.tradeName} />
                <InfoRow label="Business Type"   value={msme.bizType} />
                <InfoRow label="Business Sector" value={msme.bizSector} />
                <InfoRow label="Phone"        value={<span className="font-mono">{msme.phone}</span>} />
                <InfoRow label="Email"        value={<span className="font-mono">{msme.email}</span>} />
              </div>
              <div>
                <InfoRow label="Address"      value={msme.address} />
                <InfoRow label="City"         value={msme.city} />
                <InfoRow label="State"        value={msme.state} />
                <InfoRow label="Pincode"      value={<span className="font-mono">{msme.pincode}</span>} />
                <InfoRow label="PAN"          value={<span className="font-mono">{msme.pan}</span>} />
                <InfoRow label="GST"          value={<span className="font-mono">{msme.gst}</span>} />
                <InfoRow label="Annual Turnover" value={msme.turnover} />
                <InfoRow label="Employees"    value={msme.employees} />
              </div>
            </div>
          </div>

          {/* Upcoming Meeting (read-only — scheduling is admin-only) */}
          {(meetingsLoading || upcomingMeeting) && (
            <div className="bg-card border border-border rounded-none overflow-hidden">
              <SectionHeader icon={CalendarClock} title="Upcoming Meeting" />
              <div className="px-5 py-4">
                {meetingsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : upcomingMeeting ? (
                  <>
                    <InfoRow label="Platform" value={meetingPlatformLabel(upcomingMeeting.platform)} />
                    <InfoRow label="When"      value={formatMeetingDateTime(upcomingMeeting.scheduledAt)} />
                    {upcomingMeeting.meetingLink && (
                      <InfoRow label="Link" value={
                        <a href={upcomingMeeting.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <LinkIcon className="h-3 w-3" />{upcomingMeeting.meetingLink}
                        </a>
                      } />
                    )}
                    {upcomingMeeting.dialInInfo && <InfoRow label="Dial-in" value={upcomingMeeting.dialInInfo} />}
                    {upcomingMeeting.location && <InfoRow label="Location" value={upcomingMeeting.location} />}
                    {upcomingMeeting.notes && <InfoRow label="Notes" value={upcomingMeeting.notes} />}
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* Service Agreement */}
          <AgreementCard
            role="agent"
            agreement={agreement}
            loading={agreementLoading}
            onView={handleViewAgreement}
            onSign={() => setSignAgreementOpen(true)}
          />

          {/* Payment Requests */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader
              icon={IndianRupee}
              title="Payment Requests"
              action={
                <button className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors" onClick={() => setPaymentRequestOpen(true)}>
                  <IndianRupee className="h-3 w-3" />Request Payment
                </button>
              }
            />
            <div className="px-5 py-3">
              {paymentRequestsLoading ? (
                <div className="space-y-2 py-2"><Skeleton className="h-10 w-full" /></div>
              ) : paymentRequests.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {paymentRequests.map((pr) => (
                    <div key={pr.id} className="flex items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-medium text-foreground truncate">{pr.title}</p>
                          <span className={`${PILL} ${PAYMENT_REQUEST_STATUS_CFG[pr.status]?.cls ?? 'bg-muted text-muted-foreground'}`}>
                            {PAYMENT_REQUEST_STATUS_CFG[pr.status]?.label ?? pr.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{pr.reason}</p>
                        {pr.status === 'REJECTED' && pr.rejectionReason && (
                          <p className="text-[11px] text-destructive mt-1">Reason: {pr.rejectionReason}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {new Date(pr.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground shrink-0">
                        ₹{pr.approvedAmount ?? pr.requestedAmount}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                  <IndianRupee className="h-8 w-8 mb-2" />
                  <p className="text-sm">No payment requests yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Scheme */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader
              icon={Package}
              title="Scheme Details"
              action={caseDetails.schemeId && (
                <Link
                  href={`/agent/dashboard/schemes/${caseDetails.schemeId}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />Full Details
                </Link>
              )}
            />
            <div className="px-5 py-4 space-y-3">
              <InfoRow label="Scheme" value={scheme} />
              {caseDetails.schemeDetails?.description && (
                <div className="pt-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-[13px] text-foreground">{caseDetails.schemeDetails.description}</p>
                </div>
              )}
              {caseDetails.schemeDetails?.documents_required?.length ? (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Required Documents</p>
                  <ul className="space-y-0.5">
                    {caseDetails.schemeDetails.documents_required.map((item, i) => (
                      <li key={i} className="text-[13px] text-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">·</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader
              icon={FileText}
              title={`Uploaded Documents (${documents.length})`}
              action={
                <button className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors" onClick={() => setUploadOpen(true)}>
                  <Upload className="h-3 w-3" />Upload
                </button>
              }
            />
            <div className="px-5 py-3">
              {docsLoading ? (
                <div className="space-y-2 py-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : documents.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 py-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.document_tag || 'Document'} · {formatBytes(doc.file_size)} · {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      {doc.file_url && (
                        <button onClick={() => openDocument({ id: doc.id, type: 'doc', file_url: doc.file_url, file_name: doc.file_name, presigned_url: doc.presigned_url })}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
                          <Download className="h-3 w-3" />Open
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                  <Inbox className="h-8 w-8 mb-2" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Document Requests */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader
              icon={Inbox}
              title={`Document Requests${pendingRequests > 0 ? ` · ${pendingRequests} pending` : ''}`}
              action={
                <button className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors" onClick={() => setReqDocOpen(true)}>
                  <FilePlus className="h-3 w-3" />Request
                </button>
              }
            />
            <div className="px-5 py-3">
              {reqsLoading ? (
                <div className="space-y-2 py-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : docRequests.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {docRequests.map((req) => (
                    <div key={req.id} className="flex items-start gap-3 py-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <FilePlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-medium text-foreground truncate">{req.document_name}</p>
                          <span className={`${PILL} ${REQ_CFG[req.status] ?? 'bg-muted text-muted-foreground'}`}>{req.status.charAt(0) + req.status.slice(1).toLowerCase()}</span>
                        </div>
                        {req.description && <p className="text-[11px] text-muted-foreground truncate">{req.description}</p>}
                        <p className="text-[10px] text-muted-foreground/70">
                          {new Date(req.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {req.fulfilled_at && ` · Fulfilled ${new Date(req.fulfilled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                      {req.status === 'UPLOADED' && (
                        <button onClick={() => openDocument({ id: req.id, type: 'req', file_url: req.file_url ?? '', file_name: req.uploaded_file_name || req.document_name, presigned_url: req.presigned_url })}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
                          <Download className="h-3 w-3" />View
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                  <Inbox className="h-8 w-8 mb-2" />
                  <p className="text-sm">No document requests yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — timeline */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <SectionHeader icon={Clock} title="Timeline" />
          <div className="px-5 py-4">
            {caseDetails.timeline?.length ? (
              <div className="space-y-0">
                {caseDetails.timeline.map((item, index) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      {index < caseDetails.timeline!.length - 1 && <div className="w-px flex-1 bg-border/60 mt-1 mb-1" />}
                    </div>
                    <div className="flex-1 pb-4 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground leading-tight">{formatAction(item.action)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.performedBy || 'System'} · {new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                      {item.action === 'STATUS_CHANGED' && item.newValue && (
                        <span className={`${PILL} mt-1 bg-primary/10 text-primary`}>
                          {typeof item.newValue === 'object'
                            ? (item.newValue.status || item.newValue.newStatus || '')
                            : String(item.newValue)}
                        </span>
                      )}
                      {item.notes && (() => {
                        let display = item.notes;
                        try { const p = JSON.parse(item.notes); display = p.agentNotes || p.adminNotes || p.msmeNotes || item.notes; } catch {}
                        return <p className="text-[11px] text-foreground/70 mt-1.5 bg-muted/40 rounded px-2 py-1 leading-snug">{display}</p>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                <Clock className="h-8 w-8 mb-2" />
                <p className="text-sm">No events yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs (logic unchanged) ─────────────────────────────────────────── */}

      {/* Upload Document */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!uploading) { setUploadOpen(open); if (!open) { setUploadFile(null); setUploadTag(''); } } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Upload Document</DialogTitle>
            <DialogDescription>PDF, JPEG, PNG, WebP, Word — max 10 MB.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div
              className="border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-7 w-7 text-primary" />
                  <div className="text-left"><p className="font-medium text-sm">{uploadFile.name}</p><p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p></div>
                </div>
              ) : (
                <div><Upload className="h-7 w-7 mx-auto mb-1.5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click to browse</p></div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            <div className="space-y-1.5">
              <Label>Label <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="e.g. PAN Card, Bank Statement…" value={uploadTag} onChange={(e) => setUploadTag(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button size="sm" onClick={handleUpload} disabled={!uploadFile || uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Documents (one or more) */}
      <RequestDocumentsDialog
        open={reqDocOpen}
        onOpenChange={setReqDocOpen}
        onCreate={(name, description) => casesApi.createDocumentRequest(caseId, name, description)}
        onDone={refreshAfterDocRequests}
      />

      {/* Update Status */}
      <Dialog open={statusOpen} onOpenChange={(open) => { if (!updatingStatus) { setStatusOpen(open); if (!open) setStatusNotes(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />Update Case Status</DialogTitle>
            <DialogDescription>Current: <StatusPill status={caseDetails.status} /></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select a status…" /></SelectTrigger>
                <SelectContent>
                  {CASE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea placeholder="Add a note about this status change…" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusOpen(false)} disabled={updatingStatus}>Cancel</Button>
            <Button size="sm" onClick={handleStatusUpdate} disabled={!newStatus || updatingStatus}>
              {updatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact MSME */}
      <Dialog open={contactOpen} onOpenChange={(open) => { if (!loggingContact) { setContactOpen(open); if (!open) { setContactNotes(''); setContactMethod('Phone'); } } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Contact MSME</DialogTitle>
            <DialogDescription>Log interaction with <strong>{msme.name || businessName}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-card border border-border rounded-md divide-y divide-border/50">
              {msme.phone && (
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${msme.phone}`} className="text-sm font-medium text-primary hover:underline font-mono">{msme.phone}</a>
                </div>
              )}
              {msme.email && (
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${msme.email}`} className="text-sm font-medium text-primary hover:underline font-mono">{msme.email}</a>
                </div>
              )}
              {(msme.city || msme.state) && (
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground">{[msme.city, msme.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Contact Method</Label>
              <Select value={contactMethod} onValueChange={setContactMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTACT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea placeholder="Brief summary of the conversation…" value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setContactOpen(false)} disabled={loggingContact}>Close</Button>
            <Button size="sm" onClick={handleLogContact} disabled={loggingContact}>
              {loggingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Log Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignAgreementDialog
        open={signAgreementOpen}
        onOpenChange={setSignAgreementOpen}
        onRequestOtp={handleRequestSignOtp}
        onSign={handleSignAgreement}
        onDone={fetchAgreement}
      />

      <PaymentRequestDialog
        open={paymentRequestOpen}
        onOpenChange={setPaymentRequestOpen}
        onSubmit={handleCreatePaymentRequest}
        onDone={fetchPaymentRequests}
      />

      {viewerUrl && (
        <DocumentViewer
          fileUrl={viewerUrl}
          fileName={viewerName}
          onClose={() => { setViewerUrl(null); setViewerName(''); }}
        />
      )}
    </div>
  );
}

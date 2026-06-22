'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { casesApi, API_BASE_URL } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RequestDocumentsDialog } from '@/components/cases/RequestDocumentsDialog';
import { MeetingDialog, MeetingFormValues } from '@/components/cases/MeetingDialog';
import { AgreementCard, AgreementInfo } from '@/components/cases/AgreementCard';
import { meetingPlatformLabel, formatMeetingDateTime, CaseMeeting } from '@/lib/meetingUtils';
import { DocumentViewer } from '@/components/ui/document-viewer';
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
import {
  ArrowLeft,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Upload,
  Loader2,
  Download,
  RefreshCw,
  FilePlus,
  Inbox,
  MessageSquare,
  TrendingUp,
  CalendarClock,
  CalendarX2,
  CalendarCheck2,
  Link as LinkIcon,
} from 'lucide-react';

interface CaseDetails {
  id: string;
  caseNumber: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  msmeName: string;
  msmeBusinessName: string;
  msmePhone: string;
  msmeEmail: string;
  msmeAddress: string;
  schemeId: string;
  schemeName: string;
  assignedAgentId?: number;
  assignedAgentName?: string;
  assignedAgentEmail?: string;
  assignedAgentPhone?: string;
  timeline?: Array<{
    id: string;
    action: string;
    performedBy: string;
    performedByType?: string;
    performedByAdminRole?: string | null;
    performedByAdminCode?: string | null;
    timestamp: string;
    notes?: string;
    oldValue?: any;
    newValue?: any;
  }>;
  schemeDetails?: any;
}

interface CaseDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  document_tag: string;
  uploaded_at: string;
  presigned_url?: string;
}

interface DocumentRequest {
  id: string;
  case_id: string;
  case_number?: string;
  document_name: string;
  description?: string;
  status: 'PENDING' | 'UPLOADED';
  requested_at: string;
  fulfilled_at?: string;
}

const STATUS_OPTIONS = [
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'UNDER_REVIEW',
  'DOCUMENTS_PENDING',
  'APPROVED',
  'CLOSED',
  'CANCELLED',
];

const PRIORITY_OPTIONS = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

const PILL = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  NEW:               { label: 'New',            cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  ASSIGNED:          { label: 'Assigned',       cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  IN_PROGRESS:       { label: 'In Progress',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  UNDER_REVIEW:      { label: 'Under Review',   cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  DOCUMENTS_PENDING: { label: 'Docs Pending',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  APPROVED:          { label: 'Approved',       cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED:          { label: 'Rejected',       cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  CLOSED:            { label: 'Closed',         cls: 'bg-muted text-muted-foreground' },
  CANCELLED:         { label: 'Cancelled',      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  ESCALATED:         { label: 'Escalated',      cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
};
const PRIORITY_CFG: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
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

function formatAction(action: string) {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAdminAuth();
  const caseId = params.id as string;

  // ── Core state ──────────────────────────────────────────────────────────────
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Documents state ─────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // ── Upload-document dialog ─────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Request-document dialog ────────────────────────────────────────────────
  const [reqDocOpen, setReqDocOpen] = useState(false);

  // ── Update-status dialog ────────────────────────────────────────────────────
  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // ── Document viewer ────────────────────────────────────────────────────────
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState<string>('');

  const openDocument = async (opts: {
    id: string;
    file_url: string;
    file_name: string;
    presigned_url?: string | null;
  }) => {
    let url: string | null = opts.presigned_url ?? null;
    if (!url) {
      try {
        const res = await casesApi.getAdminDocumentUrl(caseId, opts.id);
        url = res?.fileUrl ?? null;
      } catch { /* fall through */ }
    }
    if (!url) {
      toast.error('Document is temporarily unavailable. Please refresh and try again.');
      return;
    }
    setViewerUrl(url);
    setViewerName(opts.file_name);
  };

  // ── Notes dialog ───────────────────────────────────────────────────────────
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // ── Priority dialog ────────────────────────────────────────────────────────
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [newPriority, setNewPriority] = useState('');
  const [updatingPriority, setUpdatingPriority] = useState(false);

  // ── Meetings ─────────────────────────────────────────────────────────────────
  const [meetings, setMeetings] = useState<CaseMeeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingDialogMode, setMeetingDialogMode] = useState<'schedule' | 'reschedule'>('schedule');
  const [cancelMeetingOpen, setCancelMeetingOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingMeeting, setCancellingMeeting] = useState(false);
  const [completingMeeting, setCompletingMeeting] = useState(false);

  const activeMeeting = meetings.find((m) => m.status === 'SCHEDULED') || null;

  const fetchMeetings = async () => {
    setMeetingsLoading(true);
    try {
      const res = await casesApi.getCaseMeetings(caseId);
      if (res.success) setMeetings(res.meetings || []);
    } catch (err: any) {
      console.error('Failed to load meetings:', err.message);
    } finally {
      setMeetingsLoading(false);
    }
  };

  // ── Agreement ────────────────────────────────────────────────────────────────
  const [agreement, setAgreement] = useState<AgreementInfo | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  const fetchAgreement = async () => {
    setAgreementLoading(true);
    try {
      const res = await casesApi.getAgreement(caseId);
      if (res.success) setAgreement(res.agreement || null);
    } catch (err: any) {
      console.error('Failed to load agreement:', err.message);
    } finally {
      setAgreementLoading(false);
    }
  };

  const handleUploadAgreement = async (file: File) => {
    setUploadingAgreement(true);
    try {
      const res = await casesApi.uploadAgreement(caseId, file);
      if (res.success === false) {
        toast.error(res.message || 'Failed to upload agreement');
        return;
      }
      toast.success(res.message || 'Agreement uploaded');
      await fetchAgreement();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload agreement');
    } finally {
      setUploadingAgreement(false);
    }
  };

  const handleRemoveAgreement = async () => {
    try {
      const res = await casesApi.removeAgreement(caseId);
      if (res.success === false) {
        toast.error(res.message || 'Failed to remove agreement');
        return;
      }
      toast.success(res.message || 'Agreement removed');
      await fetchAgreement();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove agreement');
    }
  };

  const handleViewAgreement = async () => {
    try {
      const res = await casesApi.getAgreementUrl(caseId);
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

  // ── Fetch case details ──────────────────────────────────────────────────────
  const fetchCaseDetails = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const res = await casesApi.getAdminCaseDetails(caseId);
      if (res.success) {
        const timeline = (res.history ?? []).map((h: any) => ({
          id: String(h.id),
          action: h.action,
          performedBy: h.performedBy ?? h.performed_by_name ?? 'System',
          performedByType: h.performedByType ?? h.performed_by_type,
          performedByAdminRole: h.performedByAdminRole ?? h.performed_by_admin_role ?? null,
          performedByAdminCode: h.performedByAdminCode ?? h.performed_by_admin_code ?? null,
          timestamp: h.createdAt ?? h.created_at ?? h.timestamp,
          notes: h.notes ?? undefined,
          oldValue: h.oldValue ?? h.old_value,
          newValue: h.newValue ?? h.new_value,
        }));
        setCaseDetails({ ...res.case, timeline });
      } else {
        setError('Failed to load case details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load case details');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails(true);
    fetchMeetings();
    fetchAgreement();
  }, [caseId]);

  // ── Fetch documents ─────────────────────────────────────────────────────────
  const fetchDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cases/admin/${caseId}/documents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [caseId]);

  // ── Upload document ────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const res = await fetch(`${API_BASE_URL}/api/cases/admin/${caseId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`"${uploadFile.name}" uploaded successfully`);
        setUploadOpen(false);
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchDocuments();
        await fetchCaseDetails();
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Request document(s) ──────────────────────────────────────────────────────
  // Creates ONE request; the shared dialog loops this for each document the admin
  // adds, so multiple documents can be requested in a single popup.
  const createAdminDocRequest = async (documentName: string, description?: string) => {
    const res = await fetch(`${API_BASE_URL}/api/cases/admin/${caseId}/document-requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentName, description }),
    });
    return res.json();
  };

  // ── Update status ──────────────────────────────────────────────────────────
  const handleUpdateStatus = async () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }
    try {
      await casesApi.updateCaseStatusAdmin(caseId, newStatus);
      toast.success('Status updated successfully');
      setStatusOpen(false);
      await fetchCaseDetails();
    } catch (err: any) {
      toast.error(err.message || 'Status update failed. Please try again.');
    }
  };

  // ── Save notes ─────────────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    if (!admin) return;
    setSavingNotes(true);
    try {
      await casesApi.addAdminNote(caseId, notes);
      toast.success('Notes saved successfully');
      setNotesOpen(false);
      await fetchCaseDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdatePriority = async () => {
    if (!newPriority) { toast.error('Please select a priority'); return; }
    setUpdatingPriority(true);
    try {
      await casesApi.updateCasePriority(caseId, newPriority);
      toast.success(`Priority set to ${newPriority}`);
      setPriorityOpen(false);
      await fetchCaseDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  // ── Meetings ─────────────────────────────────────────────────────────────────
  const handleMeetingSubmit = async (values: MeetingFormValues) => {
    if (meetingDialogMode === 'schedule') {
      return casesApi.scheduleMeeting(caseId, {
        platform: values.platform,
        scheduledAt: values.scheduledAt,
        durationMinutes: values.durationMinutes,
        meetingLink: values.meetingLink,
        dialInInfo: values.dialInInfo,
        location: values.location,
        notes: values.notes,
      });
    }
    if (!activeMeeting) return { success: false, message: 'No active meeting to reschedule' };
    return casesApi.rescheduleMeeting(caseId, String(activeMeeting.id), values.scheduledAt, values.reason);
  };

  const handleCancelMeeting = async () => {
    if (!activeMeeting) return;
    setCancellingMeeting(true);
    try {
      const res = await casesApi.cancelMeeting(caseId, String(activeMeeting.id), cancelReason.trim() || undefined);
      if (res.success === false) {
        toast.error(res.message || 'Failed to cancel meeting');
        return;
      }
      toast.success('Meeting cancelled');
      setCancelMeetingOpen(false);
      setCancelReason('');
      await fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel meeting');
    } finally {
      setCancellingMeeting(false);
    }
  };

  const handleCompleteMeeting = async () => {
    if (!activeMeeting) return;
    setCompletingMeeting(true);
    try {
      const res = await casesApi.completeMeeting(caseId, String(activeMeeting.id));
      if (res.success === false) {
        toast.error(res.message || 'Failed to mark meeting as done');
        return;
      }
      toast.success('Meeting marked as done');
      await fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark meeting as done');
    } finally {
      setCompletingMeeting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (error || !caseDetails) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to Cases
        </button>
        <div className="bg-card border border-border rounded-none flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">Failed to load case</p>
          <p className="text-xs text-muted-foreground">{error || 'Case not found'}</p>
        </div>
      </div>
    );
  }

  const actionBtn = 'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors';
  const isAdminRole = admin?.role === 'ADMIN' || admin?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />Back to Cases
        </button>

        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Case Detail</p>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground font-mono">
              {caseDetails.caseNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusPill status={caseDetails.status} />
              <PriorityPill priority={caseDetails.priority} />
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">
                {caseDetails.schemeName || caseDetails.schemeId}
              </span>
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
            {isAdminRole && (
              <button className={actionBtn} onClick={() => { setNewPriority(caseDetails.priority); setPriorityOpen(true); }}>
                <TrendingUp className="h-3.5 w-3.5" />Change Priority
              </button>
            )}
            <button className={actionBtn} onClick={() => setNotesOpen(true)}>
              <MessageSquare className="h-3.5 w-3.5" />Add Note
            </button>
            <button
              className={actionBtn}
              onClick={() => { fetchCaseDetails(); fetchDocuments(); }}
            >
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </button>
          </div>
        </div>

        {/* Quick-stats strip */}
        <div className="flex items-center gap-5 mt-5 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Created</p>
            <p className="text-sm font-semibold text-foreground">
              {new Date(caseDetails.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Last Updated</p>
            <p className="text-sm font-semibold text-foreground">
              {new Date(caseDetails.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Documents</p>
            <p className="text-sm font-semibold text-foreground">{documents.length}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Timeline Events</p>
            <p className="text-sm font-semibold text-foreground">{caseDetails.timeline?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-4">

          {/* MSME Information */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader icon={Building2} title="MSME Information" />
            <div className="px-5 py-4">
              <InfoRow label="Name"          value={caseDetails.msmeName} />
              <InfoRow label="Business Name" value={caseDetails.msmeBusinessName} />
              <InfoRow label="Phone"         value={<span className="font-mono">{caseDetails.msmePhone}</span>} />
              <InfoRow label="Email"         value={<span className="font-mono">{caseDetails.msmeEmail}</span>} />
              <InfoRow label="Address"       value={caseDetails.msmeAddress} />
            </div>
          </div>

          {/* Assigned Agent */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader icon={User} title="Assigned Agent" />
            <div className="px-5 py-4">
              {caseDetails.assignedAgentName ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {caseDetails.assignedAgentName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{caseDetails.assignedAgentName}</p>
                      <p className="text-xs text-muted-foreground">Assigned Agent</p>
                    </div>
                  </div>
                  <InfoRow label="Phone" value={<span className="font-mono">{caseDetails.assignedAgentPhone || '—'}</span>} />
                  <InfoRow label="Email" value={<span className="font-mono">{caseDetails.assignedAgentEmail || '—'}</span>} />
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground/60 italic">No agent assigned yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Meeting */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader
              icon={CalendarClock}
              title="Meeting"
              action={
                caseDetails.assignedAgentName && !activeMeeting && !meetingsLoading ? (
                  <button
                    className={actionBtn}
                    onClick={() => { setMeetingDialogMode('schedule'); setMeetingDialogOpen(true); }}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />Schedule Meeting
                  </button>
                ) : undefined
              }
            />
            <div className="px-5 py-4">
              {meetingsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !caseDetails.assignedAgentName ? (
                <div className="flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground/60 italic">Assign an agent before scheduling a meeting</p>
                </div>
              ) : activeMeeting ? (
                <>
                  <InfoRow label="Platform" value={meetingPlatformLabel(activeMeeting.platform)} />
                  <InfoRow label="When"      value={formatMeetingDateTime(activeMeeting.scheduledAt)} />
                  {activeMeeting.meetingLink && (
                    <InfoRow label="Link" value={
                      <a href={activeMeeting.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <LinkIcon className="h-3 w-3" />{activeMeeting.meetingLink}
                      </a>
                    } />
                  )}
                  {activeMeeting.dialInInfo && <InfoRow label="Dial-in" value={activeMeeting.dialInInfo} />}
                  {activeMeeting.location && <InfoRow label="Location" value={activeMeeting.location} />}
                  {activeMeeting.notes && <InfoRow label="Notes" value={activeMeeting.notes} />}

                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    <button className={actionBtn} onClick={() => { setMeetingDialogMode('reschedule'); setMeetingDialogOpen(true); }}>
                      <CalendarClock className="h-3.5 w-3.5" />Reschedule
                    </button>
                    <button className={actionBtn} onClick={() => setCancelMeetingOpen(true)}>
                      <CalendarX2 className="h-3.5 w-3.5" />Cancel
                    </button>
                    <button className={actionBtn} onClick={handleCompleteMeeting} disabled={completingMeeting}>
                      {completingMeeting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck2 className="h-3.5 w-3.5" />}
                      Mark as Done
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground/60 italic">No meeting scheduled</p>
                </div>
              )}
            </div>
          </div>

          {/* Service Agreement */}
          <AgreementCard
            role="admin"
            agreement={agreement}
            loading={agreementLoading}
            canUpload={!!caseDetails.assignedAgentName}
            onUpload={handleUploadAgreement}
            onRemove={handleRemoveAgreement}
            onView={handleViewAgreement}
          />

          {/* Documents */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader
              icon={FileText}
              title={`Documents (${documents.length})`}
              action={
                <button className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors`} onClick={() => setUploadOpen(true)}>
                  <Upload className="h-3 w-3" />Upload
                </button>
              }
            />
            <div className="px-5 py-3">
              {docsLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : documents.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {doc.document_tag || 'Document'} · {(doc.file_size / 1024).toFixed(1)} KB · {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openDocument({ id: doc.id, file_url: doc.file_url, file_name: doc.file_name, presigned_url: doc.presigned_url })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                      >
                        <Download className="h-3 w-3" />Open
                      </button>
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
        </div>

        {/* Right — timeline */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <SectionHeader icon={Clock} title="Timeline" />
          <div className="px-5 py-4">
            {caseDetails.timeline && caseDetails.timeline.length > 0 ? (
              <div className="space-y-0">
                {caseDetails.timeline.map((item, index) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      {index < caseDetails.timeline!.length - 1 && (
                        <div className="w-px flex-1 bg-border/60 mt-1 mb-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground leading-tight">{formatAction(item.action)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {item.performedByType === 'ADMIN' && item.performedByAdminRole === 'ADMIN' && item.performedByAdminCode
                            ? item.performedByAdminCode
                            : item.performedBy || 'System'}
                        </span>
                        {item.performedByType && (
                          <span className={`${PILL} text-[9px] py-0 ${
                            item.performedByType === 'ADMIN' && item.performedByAdminRole === 'SUPER_ADMIN'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                            item.performedByType === 'ADMIN'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                            item.performedByType === 'AGENT'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {item.performedByType === 'ADMIN' && item.performedByAdminRole === 'SUPER_ADMIN'
                              ? 'Super Admin'
                              : item.performedByType === 'SYSTEM'
                                ? 'System'
                                : item.performedByType.charAt(0) + item.performedByType.slice(1).toLowerCase()}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50">·</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(item.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                      {item.action === 'STATUS_CHANGED' && item.newValue && (
                        <span className={`${PILL} mt-1 bg-primary/10 text-primary`}>
                          {typeof item.newValue === 'object'
                            ? (item.newValue.status || item.newValue.newStatus || '')
                            : String(item.newValue)}
                        </span>
                      )}
                      {item.notes && (() => {
                        let display = item.notes;
                        try {
                          const parsed = JSON.parse(item.notes);
                          display = parsed.adminNotes || parsed.agentNotes || parsed.msmeNotes || item.notes;
                        } catch {}
                        return (
                          <p className="text-[11px] text-foreground/70 mt-1.5 bg-muted/40 rounded px-2 py-1 leading-snug">{display}</p>
                        );
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

      {/* ── Dialogs (logic unchanged) ────────────────────────────────────────── */}

      {/* Upload Document */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!uploading) setUploadOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />Upload Document
            </DialogTitle>
            <DialogDescription>Attach a file to this case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            />
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
        onCreate={createAdminDocRequest}
        onDone={fetchCaseDetails}
      />

      {/* Update Status */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />Update Status
            </DialogTitle>
            <DialogDescription>Change the current status of this case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleUpdateStatus} disabled={!newStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Notes */}
      <Dialog open={notesOpen} onOpenChange={(open) => { if (!savingNotes) setNotesOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />Add Note
            </DialogTitle>
            <DialogDescription>Internal admin note for this case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter your notes about this case" rows={5} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotesOpen(false)} disabled={savingNotes}>Cancel</Button>
            <Button size="sm" onClick={handleSaveNotes} disabled={!notes || savingNotes}>
              {savingNotes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Priority */}
      <Dialog open={priorityOpen} onOpenChange={(open) => { if (!updatingPriority) setPriorityOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />Change Priority
            </DialogTitle>
            <DialogDescription>Update the priority level for this case.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPriorityOpen(false)} disabled={updatingPriority}>Cancel</Button>
            <Button size="sm" onClick={handleUpdatePriority} disabled={!newPriority || updatingPriority}>
              {updatingPriority && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule / Reschedule Meeting */}
      <MeetingDialog
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        mode={meetingDialogMode}
        currentPlatform={activeMeeting?.platform}
        onSubmit={handleMeetingSubmit}
        onDone={fetchMeetings}
      />

      {/* Cancel Meeting */}
      <Dialog open={cancelMeetingOpen} onOpenChange={(open) => { if (!cancellingMeeting) { setCancelMeetingOpen(open); if (!open) setCancelReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarX2 className="h-5 w-5" />Cancel Meeting
            </DialogTitle>
            <DialogDescription>The agent and MSME will be notified by email that the meeting is cancelled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why is this meeting being cancelled" rows={3} disabled={cancellingMeeting} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelMeetingOpen(false)} disabled={cancellingMeeting}>Keep Meeting</Button>
            <Button size="sm" variant="destructive" onClick={handleCancelMeeting} disabled={cancellingMeeting}>
              {cancellingMeeting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancel Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

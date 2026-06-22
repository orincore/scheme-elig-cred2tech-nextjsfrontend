'use client';

import { useEffect, useRef, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  FileText,
  AlertCircle,
  User,
  Calendar,
  Upload,
  Loader2,
  Inbox,
  FilePlus,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  CalendarClock,
  FileSignature,
} from 'lucide-react';
import { formatMeetingDateTime } from '@/lib/meetingUtils';
import { casesApi, API_BASE_URL } from '@/lib/services/api';
import { DocumentViewer } from '@/components/ui/document-viewer';

interface Case {
  id: string;
  caseNumber: string;
  msmeBusinessName: string;
  msmeName: string;
  schemeName: string;
  schemeId: string;
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'DOCUMENTS_PENDING' | 'APPROVED' | 'CLOSED' | 'REJECTED' | 'ESCALATED' | string;
  assignedAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedAgentName?: string;
  assignedAgentEmail?: string;
  assignedAgentPhone?: string;
  msmeNotes?: string;
  agentNotes?: string;
  createdAt: string;
  updatedAt: string;
  nextMeetingAt?: string;
  agreementPendingSignature?: boolean;
}

interface DocumentRequest {
  id: string;
  case_id: string;
  case_number?: string;
  scheme_name?: string;
  document_name: string;
  description?: string;
  status: 'PENDING' | 'UPLOADED' | 'CANCELLED';
  requested_at: string;
  fulfilled_at?: string;
  agent_name?: string;
  file_url?: string;
  uploaded_file_name?: string;
  presigned_url?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  NEW:               { label: 'New',              cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  ASSIGNED:          { label: 'Assigned',         cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  IN_PROGRESS:       { label: 'In Progress',      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  UNDER_REVIEW:      { label: 'Under Review',     cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  ESCALATED:         { label: 'Escalated',        cls: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  DOCUMENTS_PENDING: { label: 'Docs Pending',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  APPROVED:          { label: 'Approved',         cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  CLOSED:            { label: 'Closed',           cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED:          { label: 'Rejected',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const DOC_STATUS_CONFIG: Record<string, string> = {
  PENDING:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  UPLOADED:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const PRIORITY_CONFIG: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  LOW:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status.replace(/_/g, ' '), cls: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const cls = PRIORITY_CONFIG[priority] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {priority}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TrackApplicationsPage() {
  const { authStep, userId } = useMsmeAuth();
  const router = useRouter();

  const [isLoading, setIsLoading]   = useState(true);
  const [cases, setCases]           = useState<Case[]>([]);

  const [docRequests, setDocRequests]   = useState<DocumentRequest[]>([]);
  const [reqsLoading, setReqsLoading]   = useState(false);

  const [uploadOpen, setUploadOpen]         = useState(false);
  const [activeRequest, setActiveRequest]   = useState<DocumentRequest | null>(null);
  const [uploadFile, setUploadFile]         = useState<File | null>(null);
  const [uploading, setUploading]           = useState(false);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const [viewerUrl, setViewerUrl]   = useState<string | null>(null);
  const [viewerName, setViewerName] = useState<string>('');

  const openDocument = async (opts: {
    id: string;
    file_name: string;
    presigned_url?: string | null;
  }) => {
    let url: string | null = opts.presigned_url ?? null;
    if (!url && userId) {
      try {
        const res = await casesApi.getMsmeDocumentRequestUrl(opts.id, parseInt(userId));
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

  useEffect(() => {
    const token = sessionStorage.getItem('msme_auth_token');
    if (!token && authStep !== 'authenticated') router.push('/');
  }, [authStep, router]);

  const fetchCases = async (msmeUserId: number) => {
    try {
      const res = await casesApi.getMsmeCases(msmeUserId);
      if (res.success) setCases(res.cases);
    } catch (err) {
      console.error('Error fetching cases:', err);
    }
  };

  const fetchDocumentRequests = async (msmeUserId: number) => {
    setReqsLoading(true);
    try {
      const res = await casesApi.getMsmeDocumentRequests(msmeUserId);
      if (res.success) setDocRequests(res.requests || []);
    } catch (err) {
      console.error('Error fetching document requests:', err);
    } finally {
      setReqsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const msmeUserId = userId ? parseInt(userId) : null;
      if (!msmeUserId) { setIsLoading(false); return; }
      await Promise.all([fetchCases(msmeUserId), fetchDocumentRequests(msmeUserId)]);
      setIsLoading(false);
    };
    if (authStep === 'authenticated') load();
  }, [authStep, userId]);

  const handleUploadFulfillment = async () => {
    if (!activeRequest || !uploadFile || !userId) return;
    setUploading(true);
    try {
      await casesApi.fulfillDocumentRequest(activeRequest.id, parseInt(userId), uploadFile);
      toast.success(`"${uploadFile.name}" uploaded successfully`);
      setUploadOpen(false);
      setUploadFile(null);
      setActiveRequest(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocumentRequests(parseInt(userId));
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

  const openDeleteDialog = (c: Case) => {
    setCaseToDelete(c);
    setDeleteOpen(true);
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete || !userId) return;
    setDeleting(true);
    try {
      await casesApi.deleteCase(caseToDelete.id, parseInt(userId));
      toast.success(`Application "${caseToDelete.schemeName}" deleted successfully`);
      setDeleteOpen(false);
      setCaseToDelete(null);
      await fetchCases(parseInt(userId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete application. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (authStep !== 'authenticated') return null;

  const pendingRequests  = docRequests.filter((r) => r.status === 'PENDING');

  // Active = everything not yet closed/rejected/docs-pending
  const ACTIVE_STATUSES = new Set(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED']);
  const DONE_STATUSES   = new Set(['CLOSED', 'APPROVED']);
  const DOCS_STATUSES   = new Set(['DOCUMENTS_PENDING', 'PENDING_DOCS']);

  const inProgressCount  = cases.filter((c) => ACTIVE_STATUSES.has(c.status)).length;
  const completedCount   = cases.filter((c) => DONE_STATUSES.has(c.status)).length;
  const pendingDocsCount = cases.filter((c) => DOCS_STATUSES.has(c.status)).length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="border-b-2 border-border pb-6 space-y-3">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-8 w-52 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
          <div className="flex items-center gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-56 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ─── Page Header ──────────────────────────────────────────────────── */}
        <div className="border-b-2 border-border pb-6">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">
            My Activity
          </p>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Track Applications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor your scheme application progress
              </p>
            </div>
            <Button size="sm" onClick={() => router.push('/dashboard')}>
              Browse Schemes
            </Button>
          </div>

          {/* Inline stats row */}
          <div className="flex items-center gap-5 mt-6 flex-wrap">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Total</p>
              <p className="text-2xl font-bold text-foreground">{cases.length}</p>
              <p className="text-xs text-muted-foreground">All applications</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">In Progress</p>
              <p className="text-2xl font-bold text-amber-500">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">Being reviewed</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Completed</p>
              <p className="text-2xl font-bold text-green-500">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Closed successfully</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Docs Pending</p>
              <p className="text-2xl font-bold text-orange-500">{pendingDocsCount}</p>
              <p className="text-xs text-muted-foreground">Awaiting upload</p>
            </div>
          </div>
        </div>

        {/* ─── Applications Table ───────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">
                {cases.length === 0 ? 'No Applications Yet' : 'Applications'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cases.length === 0
                  ? 'Apply for schemes to track them here'
                  : `${cases.length} scheme application${cases.length !== 1 ? 's' : ''} in your account`}
              </p>
            </div>
          </div>

          {cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-foreground mb-1">No applications found</p>
              <p className="text-xs text-muted-foreground mb-4">Apply for a scheme to see it tracked here.</p>
              <Button size="sm" onClick={() => router.push('/dashboard')}>Browse Schemes</Button>
            </div>
          ) : (
            <div className="overflow-auto w-full">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                <thead>
                  <tr className="bg-background border-b-2 border-border">
                    {['Scheme / Case #', 'Business', 'Status', 'Applied · Agent', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => {
                    const caseReqs    = docRequests.filter((r) => String(r.case_id) === String(c.id));
                    const casePending = caseReqs.filter((r) => r.status === 'PENDING');
                    const bizName     = c.msmeBusinessName || c.msmeName || '—';

                    return (
                      <tr key={c.id} className="border-b border-border hover:bg-muted/20 transition-colors">

                        {/* Scheme / Case # */}
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            {c.schemeName || '—'}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{c.caseNumber}</p>
                          {casePending.length > 0 && (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                              <AlertCircle className="h-2.5 w-2.5" />
                              {casePending.length} doc{casePending.length > 1 ? 's' : ''} needed
                            </span>
                          )}
                          {c.nextMeetingAt && (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                              <CalendarClock className="h-2.5 w-2.5" />
                              Meeting {formatMeetingDateTime(c.nextMeetingAt)}
                            </span>
                          )}
                          {c.agreementPendingSignature && (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                              <FileSignature className="h-2.5 w-2.5" />
                              Agreement: Signature pending
                            </span>
                          )}
                        </td>

                        {/* Business */}
                        <td className="px-5 py-4">
                          <p className="text-sm text-foreground" title={bizName}>{bizName}</p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusPill status={c.status} />
                        </td>

                        {/* Applied · Agent */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                          {c.assignedAgentName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <User className="h-2.5 w-2.5 shrink-0" />
                              {c.assignedAgentName}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => router.push(`/track-applications/${c.id}`)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                            >
                              View Details
                            </button>
                            {casePending.length > 0 && (
                              <button
                                onClick={() => openUploadDialog(casePending[0])}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-orange-400/50 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                              >
                                <Upload className="h-3 w-3" />
                                Upload
                              </button>
                            )}
                            {c.status === 'NEW' && (
                              <button
                                onClick={() => openDeleteDialog(c)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Document Requests Table ──────────────────────────────────────── */}
        {docRequests.length > 0 && (
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  Document Requests
                  {pendingRequests.length > 0 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-full">
                      {pendingRequests.length} pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Documents requested by your assigned agent</p>
              </div>
              <button
                disabled={reqsLoading}
                onClick={() => userId && fetchDocumentRequests(parseInt(userId))}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reqsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="overflow-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr className="bg-background border-b-2 border-border">
                    {['Document', 'Case #', 'Status', 'Requested', 'Action'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docRequests.map((req) => (
                    <tr key={req.id} className="border-b border-border hover:bg-muted/10 transition-colors">

                      {/* Document */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <FilePlus className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{req.document_name}</p>
                            {req.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{req.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Case # */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-mono text-foreground">{req.case_number || '—'}</p>
                        {req.agent_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{req.agent_name}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_STATUS_CONFIG[req.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {req.status}
                        </span>
                      </td>

                      {/* Requested */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-foreground">{new Date(req.requested_at).toLocaleDateString()}</p>
                        {req.fulfilled_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Uploaded {new Date(req.fulfilled_at).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      {/* Action */}
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
                        {req.status === 'UPLOADED' && (
                          <button
                            onClick={() => openDocument({ id: req.id, file_name: req.uploaded_file_name || req.document_name, presigned_url: req.presigned_url })}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-foreground bg-muted/30 hover:bg-muted/60 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            View File
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
              <Label htmlFor="msme-file-upload">Select File</Label>
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
                id="msme-file-upload"
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
            <Button onClick={handleUploadFulfillment} disabled={!uploadFile || uploading} className="gap-2">
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
                : <><Upload className="h-4 w-4" />Submit Document</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteOpen(open);
            if (!open) setCaseToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Application
            </DialogTitle>
            <DialogDescription>
              {caseToDelete && (
                <>
                  Are you sure you want to delete your application for{' '}
                  <strong>{caseToDelete.schemeName}</strong>?
                  <br /><br />
                  <span className="text-destructive font-medium">This action cannot be undone.</span>
                  <br /><br />
                  Case Number:{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">{caseToDelete.caseNumber}</code>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button onClick={handleDeleteCase} disabled={deleting} variant="destructive" className="gap-2">
              {deleting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</>
                : <><Trash2 className="h-4 w-4" />Delete Application</>}
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
    </DashboardLayout>
  );
}

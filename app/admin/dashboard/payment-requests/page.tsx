'use client';

import { useEffect, useState } from 'react';
import { casesApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Receipt, CheckCircle2, XCircle, Calendar, Briefcase, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface AdminPaymentRequest {
  id: string | number;
  caseId: string | number;
  caseNumber: string;
  schemeName?: string;
  msmeName?: string;
  category: string;
  customTitle?: string | null;
  title: string;
  reason: string;
  requestedAmount: number;
  approvedAmount: number | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string | null;
  requestedByAgentName?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PAID', label: 'Paid' },
  { value: '', label: 'All' },
];

export default function PaymentRequestsPage() {
  const [requests, setRequests] = useState<AdminPaymentRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<AdminPaymentRequest | null>(null);
  const [approveAmount, setApproveAmount] = useState('');

  const [rejectTarget, setRejectTarget] = useState<AdminPaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const load = async (status: string) => {
    setIsLoading(true);
    try {
      const res = await casesApi.getAllPaymentRequestsForAdmin(status && status !== 'ALL' ? status : undefined);
      if (res.success) setRequests(res.paymentRequests || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load payment requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openApprove = (req: AdminPaymentRequest) => {
    setApproveTarget(req);
    setApproveAmount(String(req.requestedAmount));
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    const amount = Number(approveAmount);
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount'); return; }
    setBusyId(String(approveTarget.id));
    try {
      const res = await casesApi.reviewPaymentRequest(String(approveTarget.caseId), String(approveTarget.id), {
        action: 'APPROVE',
        amount,
      });
      if (res.success) {
        toast.success('Payment request approved');
        setApproveTarget(null);
        await load(statusFilter);
      } else {
        toast.error(res.message || 'Failed to approve');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setBusyId(String(rejectTarget.id));
    try {
      const res = await casesApi.reviewPaymentRequest(String(rejectTarget.caseId), String(rejectTarget.id), {
        action: 'REJECT',
        rejectionReason: rejectionReason.trim(),
      });
      if (res.success) {
        toast.success('Payment request rejected');
        setRejectTarget(null);
        setRejectionReason('');
        await load(statusFilter);
      } else {
        toast.error(res.message || 'Failed to reject');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-64" />
        </div>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Cases</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Payment Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">Review agent-initiated document/success/custom fee requests</p>
          </div>
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value || 'ALL'} value={s.value || 'ALL'}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card border border-border rounded-none">
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">All caught up!</p>
            <p className="text-xs text-muted-foreground">No payment requests in this view.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-none overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <Link href={`/admin/dashboard/cases/${req.caseId}`} className="text-base font-bold text-foreground hover:underline">
                        {req.title} — ₹{req.approvedAmount ?? req.requestedAmount}
                      </Link>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{req.caseNumber} · {req.schemeName}</span>
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{req.msmeName}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground mt-3">{req.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">Requested by {req.requestedByAgentName || 'agent'}</p>
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <p className="text-xs text-destructive mt-1.5">Rejected: {req.rejectionReason}</p>
                  )}
                </div>

                {req.status === 'PENDING_APPROVAL' && (
                  <div className="bg-background border-t lg:border-t-0 lg:border-l border-border p-5 lg:w-64 flex flex-col justify-center gap-2.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">Review Request</p>
                    <button
                      onClick={() => openApprove(req)}
                      disabled={busyId === String(req.id)}
                      className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />Approve
                    </button>
                    <button
                      onClick={() => setRejectTarget(req)}
                      disabled={busyId === String(req.id)}
                      className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-md border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve dialog — admin may edit the amount before approving */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Approve Payment Request</DialogTitle>
            <DialogDescription>
              Approving &quot;{approveTarget?.title}&quot; on case {approveTarget?.caseNumber} will notify the MSME and let them pay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="approve-amount">Amount (₹) — editable</Label>
            <Input id="approve-amount" type="number" min={1} step="0.01" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={busyId === String(approveTarget?.id)}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" />Reject Payment Request</DialogTitle>
            <DialogDescription>
              The agent will be notified. The MSME will never see this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Rejection Reason *</Label>
            <Textarea id="reject-reason" placeholder="Please provide a reason for rejection…" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectionReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busyId === String(rejectTarget?.id)}>Reject Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

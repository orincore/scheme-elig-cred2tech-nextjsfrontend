'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCheck, XCircle, MapPin, Award, Mail, Phone, Calendar, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalsPage() {
  const { pendingAgents, fetchPendingAgents, approveAgent } = useAdminAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPendingAgents = async () => {
    setIsLoading(true);
    await fetchPendingAgents();
    setIsLoading(false);
  };

  const handleApprove = async (agentId: string) => {
    setBusyId(agentId);
    const ok = await approveAgent(agentId, 'APPROVE');
    setBusyId(null);
    if (ok) setSelectedAgent(null);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    const ok = await approveAgent(selectedAgent.id, 'REJECT', rejectionReason);
    if (ok) { setRejectDialog(false); setSelectedAgent(null); setRejectionReason(''); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-64" />
        </div>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Onboarding</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Pending Approvals</h1>
            <p className="text-sm text-muted-foreground mt-1">Review and approve new agent registrations</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5 text-right">Pending</p>
            <p className="text-3xl font-extrabold text-amber-500 text-right leading-none">{pendingAgents.length}</p>
          </div>
        </div>
      </div>

      {pendingAgents.length === 0 ? (
        <div className="bg-card border border-border rounded-none">
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <UserCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">All caught up!</p>
            <p className="text-xs text-muted-foreground">No pending agent registrations to review.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingAgents.map((agent) => (
            <div key={agent.id} className="bg-card border border-border rounded-none overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* Info */}
                <div className="flex-1 p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {agent.fullName?.[0] || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-foreground">{agent.fullName}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{agent.email}</span>
                        {agent.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{agent.phone}</span>}
                        {agent.region && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{agent.region}</span>}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Applied {new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-1.5 flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" />Expertise
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.expertise?.length > 0 ? agent.expertise.map((exp: string) => (
                          <span key={exp} className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{exp}</span>
                        )) : <span className="text-xs text-muted-foreground/50">None listed</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-1.5 flex items-center gap-1.5">
                        <Award className="h-3 w-3" />Certifications
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.certifications?.length > 0 ? agent.certifications.map((cert: string) => (
                          <span key={cert} className="text-[10px] font-semibold border border-border text-foreground px-2 py-0.5 rounded-full">{cert}</span>
                        )) : <span className="text-xs text-muted-foreground/50">None listed</span>}
                      </div>
                    </div>
                  </div>
                  {agent.gender && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Gender: <span className="font-medium text-foreground">{agent.gender}</span>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-background border-t lg:border-t-0 lg:border-l border-border p-5 lg:w-64 flex flex-col justify-center gap-2.5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">Review Application</p>
                  <button
                    onClick={() => handleApprove(agent.id)}
                    disabled={busyId === agent.id}
                    className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    <UserCheck className="h-4 w-4" />
                    {busyId === agent.id ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => { setSelectedAgent(agent); setRejectDialog(true); }}
                    className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-md border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center mt-1">Employee ID is auto-generated on approval</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" />Reject Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedAgent?.fullName}&apos;s application? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Input id="reason" placeholder="Please provide a reason for rejection…" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

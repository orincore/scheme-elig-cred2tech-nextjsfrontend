'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Filter, CheckCircle, XCircle, UserCheck, Ban, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Agents' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const PILL = 'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full';

function StatusBadge({ agent }: { agent: any }) {
  // Approval gates first.
  if (agent.approvalStatus === 'PENDING')
    return <span className={`${PILL} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}>Pending</span>;
  if (agent.approvalStatus === 'REJECTED')
    return <span className={`${PILL} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`}>Rejected</span>;
  // Approved agents: blocked/suspended override; everything else (incl. the
  // internal status='PENDING' that approval leaves behind) is simply "Active".
  if (agent.status === 'BLOCKED')
    return <span className={`${PILL} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`}>Blocked</span>;
  if (agent.status === 'SUSPENDED')
    return <span className={`${PILL} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`}>Suspended</span>;
  return <span className={`${PILL} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>Active</span>;
}

export default function AgentsPage() {
  const router = useRouter();
  const { allAgents, fetchAllAgents, approveAgent, updateAgentStatus } = useAdminAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: string; agent: any } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadAgents = async () => {
    setIsLoading(true);
    const params: any = {};
    if (statusFilter !== 'ALL') {
      if (['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter)) params.approvalStatus = statusFilter;
      else params.status = statusFilter;
    }
    await fetchAllAgents(params);
    setIsLoading(false);
  };

  const handleApprove = async (agentId: string) => {
    const ok = await approveAgent(agentId, 'APPROVE');
    if (ok) loadAgents();
    setActionDialog(null);
  };

  const handleReject = async (agentId: string) => {
    if (!rejectionReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    const ok = await approveAgent(agentId, 'REJECT', rejectionReason);
    if (ok) { loadAgents(); setRejectionReason(''); }
    setActionDialog(null);
  };

  const handleStatusChange = async (agentId: string, action: string) => {
    const ok = await updateAgentStatus(agentId, action);
    if (ok) loadAgents();
    setActionDialog(null);
  };

  const filteredAgents = allAgents.filter((agent: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      agent.fullName?.toLowerCase().includes(q) ||
      agent.email?.toLowerCase().includes(q) ||
      agent.employeeId?.toLowerCase().includes(q);
    if (statusFilter === 'ALL') return matchesSearch;
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter)) return matchesSearch && agent.approvalStatus === statusFilter;
    return matchesSearch && agent.status === statusFilter;
  });

  const pendingCount  = allAgents.filter((a: any) => a.approvalStatus === 'PENDING').length;
  const activeCount   = allAgents.filter((a: any) => a.approvalStatus === 'APPROVED' && a.status !== 'BLOCKED').length;
  const blockedCount  = allAgents.filter((a: any) => a.status === 'BLOCKED').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Team</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Agent Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Review, approve, and manage field agents</p>

        <div className="flex items-center gap-5 mt-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Total</p>
            <p className="text-2xl font-bold text-foreground">{allAgents.length}</p>
            <p className="text-xs text-muted-foreground">All agents</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Pending</p>
            <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Active</p>
            <p className="text-2xl font-bold text-green-500">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Approved &amp; unblocked</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Blocked</p>
            <p className="text-2xl font-bold text-red-500">{blockedCount}</p>
            <p className="text-xs text-muted-foreground">Suspended access</p>
          </div>
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-none p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or employee ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Agents Table ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-background">
          <h3 className="text-[13px] font-bold text-foreground">
            {filteredAgents.length === 0 ? 'No Agents' : `Agents (${filteredAgents.length})`}
          </h3>
        </div>

        {filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">No agents found</p>
            <p className="text-xs text-muted-foreground">Try adjusting the filters.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '22%' }} />
              </colgroup>
              <thead>
                <tr className="bg-background border-b-2 border-border">
                  {['Agent', 'Expertise', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent: any) => (
                  <tr key={agent.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    {/* Agent */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                          {agent.fullName?.[0] || 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{agent.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                          <p className="text-[11px] text-muted-foreground/80 truncate">{agent.employeeId || '—'}{agent.region ? ` · ${agent.region}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    {/* Expertise */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {agent.expertise?.slice(0, 3).map((exp: string) => (
                          <span key={exp} className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{exp}</span>
                        ))}
                        {agent.expertise?.length > 3 && (
                          <span className="text-[10px] font-semibold text-muted-foreground">+{agent.expertise.length - 3}</span>
                        )}
                        {(!agent.expertise || agent.expertise.length === 0) && (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge agent={agent} />
                      {agent.approvedBy && (
                        <p className="text-[10px] text-muted-foreground/80 mt-1 truncate max-w-[130px]">
                          {agent.approvalStatus === 'REJECTED' ? 'by ' : 'by '}{agent.approvedBy}
                        </p>
                      )}
                    </td>
                    {/* Joined */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-foreground">{agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : '—'}</p>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => router.push(`/admin/dashboard/agents/${agent.id}`)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />Profile
                        </button>
                        {agent.approvalStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(agent.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              <CheckCircle className="h-3 w-3" />Approve
                            </button>
                            <button
                              onClick={() => setActionDialog({ open: true, type: 'reject', agent })}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
                            >
                              <XCircle className="h-3 w-3" />Reject
                            </button>
                          </>
                        )}
                        {agent.approvalStatus === 'APPROVED' && agent.status !== 'BLOCKED' && (
                          <button
                            onClick={() => setActionDialog({ open: true, type: 'block', agent })}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <Ban className="h-3 w-3" />Block
                          </button>
                        )}
                        {agent.approvalStatus === 'APPROVED' && agent.status === 'BLOCKED' && (
                          <button
                            onClick={() => handleStatusChange(agent.id, 'UNBLOCK')}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                          >
                            <UserCheck className="h-3 w-3" />Unblock
                          </button>
                        )}
                        {agent.approvalStatus === 'REJECTED' && (
                          <span className="text-xs text-muted-foreground/60">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={actionDialog?.type === 'reject' && actionDialog.open} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" />Reject Agent Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {actionDialog?.agent?.fullName}&apos;s application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Input id="reason" placeholder="Enter rejection reason…" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => actionDialog?.agent && handleReject(actionDialog.agent.id)}>Reject Application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={actionDialog?.type === 'block' && actionDialog.open} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5" />Block Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to block {actionDialog?.agent?.fullName}? This will prevent them from accessing the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => actionDialog?.agent && handleStatusChange(actionDialog.agent.id, 'BLOCK')}>Block Agent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { casesApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Search, Filter, UserCheck, Calendar, User, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Cases' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'DOCUMENTS_PENDING', label: 'Documents Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  NEW:               { label: 'New',          cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  ASSIGNED:          { label: 'Assigned',     cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  IN_PROGRESS:       { label: 'In Progress',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  UNDER_REVIEW:      { label: 'Under Review', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  DOCUMENTS_PENDING: { label: 'Docs Pending', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  APPROVED:          { label: 'Approved',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  CLOSED:            { label: 'Closed',       cls: 'bg-muted text-muted-foreground' },
  REJECTED:          { label: 'Rejected',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const PRIORITY_CFG: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  LOW:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status?.replace(/_/g, ' ') || '—', cls: 'bg-muted text-muted-foreground' };
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
}

function PriorityPill({ priority }: { priority: string }) {
  if (!priority) return <span className="text-xs text-muted-foreground/50">—</span>;
  const cls = PRIORITY_CFG[priority] ?? 'bg-muted text-muted-foreground';
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{priority}</span>;
}

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [eligibleAgents, setEligibleAgents] = useState<any[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState('');

  useEffect(() => {
    loadCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;

      const response = await casesApi.getAllCases(params);
      if (response.success) setCases(response.cases);
    } catch (error) {
      console.error('Failed to load cases:', error);
      toast.error('Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEligibleAgents = async (caseId: string) => {
    setEligibleLoading(true);
    setEligibleError('');
    setEligibleAgents([]);
    try {
      const res = await casesApi.getEligibleAgents(caseId);
      if (res.success) setEligibleAgents(res.agents);
      else setEligibleError('Could not load eligible agents.');
    } catch (err: any) {
      setEligibleError(err?.message || 'Could not load eligible agents.');
    } finally {
      setEligibleLoading(false);
    }
  };

  // Auto-open the assign dialog when navigated here with ?assign=<caseId>
  useEffect(() => {
    if (isLoading || cases.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const assignId = params.get('assign');
    if (!assignId) return;
    const match = cases.find((c) => String(c.id) === String(assignId));
    if (match) {
      setSelectedCase(match);
      setSelectedAgent('');
      setAssignmentNotes('');
      setAssignDialog(true);
      loadEligibleAgents(String(match.id));
      window.history.replaceState({}, '', '/admin/dashboard/cases');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, cases]);

  const handleAssign = async () => {
    if (!selectedAgent || !selectedCase) return;
    setIsAssigning(true);
    try {
      const response = await casesApi.assignCase(selectedCase.id, parseInt(selectedAgent), assignmentNotes);
      if (response.success) {
        toast.success('Case assigned successfully');
        loadCases();
        setAssignDialog(false);
        setSelectedCase(null);
        setSelectedAgent('');
        setAssignmentNotes('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign case');
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssign = (caseItem: any) => {
    setSelectedCase(caseItem);
    setSelectedAgent('');
    setAssignmentNotes('');
    setAssignDialog(true);
    loadEligibleAgents(String(caseItem.id));
  };

  const filteredCases = cases.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.caseNumber?.toLowerCase().includes(q) ||
      c.msmeName?.toLowerCase().includes(q) ||
      c.schemeName?.toLowerCase().includes(q) ||
      c.assignedAgentName?.toLowerCase().includes(q) ||
      c.agentName?.toLowerCase().includes(q)
    );
  });

  const newCount      = cases.filter((c) => c.status === 'NEW').length;
  const assignedCount = cases.filter((c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length;
  const closedCount   = cases.filter((c) => c.status === 'CLOSED' || c.status === 'APPROVED').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ──────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Operations</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Case Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Assign and track MSME scheme applications</p>
          </div>
        </div>

        {/* Inline stats */}
        <div className="flex items-center gap-5 mt-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Total</p>
            <p className="text-2xl font-bold text-foreground">{cases.length}</p>
            <p className="text-xs text-muted-foreground">All cases</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">New</p>
            <p className="text-2xl font-bold text-orange-500">{newCount}</p>
            <p className="text-xs text-muted-foreground">Need assignment</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Active</p>
            <p className="text-2xl font-bold text-amber-500">{assignedCount}</p>
            <p className="text-xs text-muted-foreground">Assigned / in progress</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Completed</p>
            <p className="text-2xl font-bold text-green-500">{closedCount}</p>
            <p className="text-xs text-muted-foreground">Closed / approved</p>
          </div>
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-none p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by case #, MSME, scheme, or agent…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Cases Table ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-background">
          <h3 className="text-[13px] font-bold text-foreground">
            {filteredCases.length === 0 ? 'No Cases' : `Cases (${filteredCases.length})`}
          </h3>
        </div>

        {filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">No cases found</p>
            <p className="text-xs text-muted-foreground">Try adjusting the filters, or wait for new applications.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <colgroup>
                <col style={{ width: '26%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr className="bg-background border-b-2 border-border">
                  {['Case # / Scheme', 'MSME', 'Status', 'Priority', 'Agent · Created', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    {/* Case # / Scheme */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-foreground font-mono">{c.caseNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">{c.schemeName || c.schemeId || '—'}</p>
                    </td>
                    {/* MSME */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[140px]">{c.msmeName || 'Unknown'}</span>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4"><StatusPill status={c.status} /></td>
                    {/* Priority */}
                    <td className="px-5 py-4"><PriorityPill priority={c.priority} /></td>
                    {/* Agent · Created */}
                    <td className="px-5 py-4">
                      {c.assignedAgentName ? (
                        <div className="flex items-center gap-1 text-sm text-foreground">
                          <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">{c.assignedAgentName}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Unassigned</p>
                      )}
                      {c.assignedByName && (
                        <p className="text-[10px] text-muted-foreground/80 truncate max-w-[140px]">by {c.assignedByName}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="h-2.5 w-2.5 shrink-0" />
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => router.push(`/admin/dashboard/cases/${c.id}`)}
                          className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                          View
                        </button>
                        {c.status === 'NEW' ? (
                          <button
                            onClick={() => openAssign(c)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            <UserCheck className="h-3 w-3" />
                            Assign
                          </button>
                        ) : (
                          <button
                            onClick={() => openAssign(c)}
                            className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                          >
                            Reassign
                          </button>
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

      {/* ─── Assign Dialog ────────────────────────────────────────────────── */}
      <Dialog open={assignDialog} onOpenChange={(open) => { if (!isAssigning) setAssignDialog(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              {selectedCase?.status === 'NEW' ? 'Assign Case' : 'Reassign Case'}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono">{selectedCase?.caseNumber}</span>
              {selectedCase?.schemeName && (
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {selectedCase.schemeName}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">· Only available agents who support this scheme are shown</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Agent list */}
            <div className="space-y-2">
              <Label>Select Agent *</Label>

              {eligibleLoading && (
                <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Finding eligible agents…</span>
                </div>
              )}

              {!eligibleLoading && eligibleError && (
                <p className="text-xs text-destructive py-2">{eligibleError}</p>
              )}

              {!eligibleLoading && !eligibleError && eligibleAgents.length === 0 && (
                <div className="rounded-md border border-border bg-muted/20 px-4 py-6 text-center">
                  <User className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-foreground">No eligible agents available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No available agents support this scheme. Check agent profiles to add supported schemes.
                  </p>
                </div>
              )}

              {!eligibleLoading && eligibleAgents.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {eligibleAgents.map((agent) => {
                    const isSelected = selectedAgent === String(agent.id);
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => setSelectedAgent(String(agent.id))}
                        className={`w-full text-left rounded-md border px-3 py-2.5 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border bg-card hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                              {agent.fullName?.[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-foreground">{agent.fullName}</p>
                                <span className="text-[10px] font-mono text-muted-foreground">{agent.employeeId}</span>
                                {agent.locationMatch === 'city' && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                    <MapPin className="h-2.5 w-2.5" />Same City
                                  </span>
                                )}
                                {agent.locationMatch === 'state' && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    <MapPin className="h-2.5 w-2.5" />Same State
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {(agent.city || agent.state) && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {[agent.city, agent.state].filter(Boolean).join(', ')}
                                  </span>
                                )}
                                {!agent.city && agent.region && (
                                  <span className="text-[11px] text-muted-foreground">{agent.region}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground/50">·</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {agent.activeCaseCount === 0 ? 'No active cases' : `${agent.activeCaseCount} active case${agent.activeCaseCount !== 1 ? 's' : ''}`}
                                </span>
                              </div>
                              {agent.expertise?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {agent.expertise.slice(0, 3).map((e: string) => (
                                    <span key={e} className="text-[9px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{e}</span>
                                  ))}
                                  {agent.expertise.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">+{agent.expertise.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add assignment notes…"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)} disabled={isAssigning}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedAgent || isAssigning}>
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAssigning ? 'Assigning…' : selectedCase?.status === 'NEW' ? 'Assign Case' : 'Reassign Case'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

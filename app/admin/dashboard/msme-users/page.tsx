'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuthApi } from '@/lib/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Building2, Search, ChevronLeft, ChevronRight, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PILL = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full';

function KycPill({ status }: { status: string }) {
  const cls =
    status === 'VERIFIED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
    status === 'PENDING'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
    'bg-muted text-muted-foreground';
  return <span className={`${PILL} ${cls}`}>{status || '—'}</span>;
}

function CaseBadge({ active }: { active: number }) {
  if (active === 0) return <span className="text-xs text-muted-foreground/50">No active</span>;
  return (
    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-semibold">
      {active} active
    </span>
  );
}

export default function MsmeUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const PAGE_SIZE = 20;

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await adminAuthApi.listMsmeUsers({ search: q, page: p, pageSize: PAGE_SIZE });
      if (res.success) {
        setUsers(res.users);
        setTotal(res.total);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load MSME users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(search, page); }, [search, page, load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminAuthApi.forceDeleteMsmeUser(deleteTarget.id);
      if (res?.success) {
        toast.success(res.message || 'User and all records deleted');
        setDeleteTarget(null);
        setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        toast.error(res?.message || 'Failed to delete user');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Platform Data</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">MSME Users</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse registered MSME users — sensitive info is masked
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground border border-border rounded-full px-3 py-1">
            <Building2 className="h-3 w-3" />
            {total} users
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mt-5 flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, mobile, or business…"
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">Search</Button>
          {search && (
            <Button type="button" size="sm" variant="ghost" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
              Clear
            </Button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-background">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {loading ? 'Loading…' : `Showing ${users.length} of ${total}`}
          </h3>
        </div>

        <div className="overflow-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr className="bg-background border-b-2 border-border">
                {['User', 'Mobile', 'Business', 'Location', 'KYC', 'Cases', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-muted-foreground">
                    No MSME users found{search ? ` for "${search}"` : ''}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/dashboard/msme-users/${u.msmCode}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground/70 font-mono">{u.msmCode || `#${u.id}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-mono text-muted-foreground">{u.mobile}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-foreground truncate max-w-[160px]" title={u.businessName}>
                        {u.businessName === '—' ? <span className="text-muted-foreground/40 italic">Not set</span> : u.businessName}
                      </p>
                      {u.enterpriseCategory && u.enterpriseCategory !== '—' && (
                        <p className="text-[10px] text-muted-foreground">{u.enterpriseCategory}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-foreground">{u.state !== '—' ? u.state : <span className="text-muted-foreground/40">—</span>}</p>
                      {u.city && u.city !== '—' && <p className="text-[10px] text-muted-foreground">{u.city}</p>}
                    </td>
                    <td className="px-5 py-4"><KycPill status={u.kycStatus} /></td>
                    <td className="px-5 py-4">
                      <CaseBadge active={u.activeCases} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/admin/dashboard/msme-users/${u.msmCode}`); }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />View
                        </button>
                        <button
                          title="Force delete user and all records"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
                          className="inline-flex items-center justify-center p-1.5 rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 dark:border-red-900/40 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-background">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} users
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 px-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 px-2">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Force-delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" /> Force delete MSME user?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  This permanently deletes <span className="font-semibold text-foreground">{deleteTarget?.name || `#${deleteTarget?.id}`}</span>
                  {deleteTarget?.mobile ? <> ({deleteTarget.mobile})</> : null} and <span className="font-semibold">ALL</span> related records:
                </p>
                <ul className="list-disc pl-5 text-muted-foreground text-[13px]">
                  <li>Scheme cases + history, documents &amp; document requests</li>
                  <li>Businesses, payments, OTP verifications</li>
                  <li>Eligibility snapshots &amp; saved eligible schemes</li>
                </ul>
                <p className="text-red-600 font-medium">This cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleForceDelete(); }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Deleting…</> : 'Force delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminAuthApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, ShieldCheck, Calendar, KeyRound, Power, Trash2, Ban, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';

const PILL = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full';

function RolePill({ role }: { role: string }) {
  return role === 'SUPER_ADMIN'
    ? <span className={`${PILL} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300`}>Super Admin</span>
    : <span className={`${PILL} bg-muted text-muted-foreground`}>Admin</span>;
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
    status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return <span className={`${PILL} ${cls}`}>{status?.charAt(0) + status?.slice(1).toLowerCase()}</span>;
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

export default function AdminProfilePage() {
  const { adminCode } = useParams<{ adminCode: string }>();
  const router = useRouter();
  const { admin: self } = useAdminAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Password reveal after reset
  const [pwdReveal, setPwdReveal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Dialogs
  const [blockOpen, setBlockOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isSelf = data && self && String(data.id) === String(self.id);
  const isSuper = self?.role === 'SUPER_ADMIN';

  const load = () => {
    if (!adminCode) return;
    adminAuthApi.getAdminByCode(adminCode)
      .then((res) => { if (res.success) setData(res.admin); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load admin'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [adminCode]);

  const handleResetPassword = async () => {
    setBusy(true);
    try {
      const res = await adminAuthApi.resetAdminPassword(data.id);
      if (res.success) {
        setPwdReveal(res.tempPassword);
        load();
      } else {
        toast.error(res.message || 'Failed to reset password');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBlock = async () => {
    setBlockOpen(false);
    setBusy(true);
    const next = data.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await adminAuthApi.updateAdminStatus(data.id, next);
      if (res.success) {
        toast.success(next === 'SUSPENDED' ? `${data.fullName} blocked` : `${data.fullName} unblocked`);
        load();
      } else {
        toast.error(res.message || 'Failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleteOpen(false);
    setBusy(true);
    try {
      const res = await adminAuthApi.deleteAdmin(data.id);
      if (res.success) {
        toast.success(`${data.fullName} deleted`);
        router.push('/admin/dashboard/admins');
      } else {
        toast.error(res.message || 'Failed to delete');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete admin');
    } finally {
      setBusy(false);
    }
  };

  const copyPwd = async () => {
    if (!pwdReveal) return;
    try { await navigator.clipboard.writeText(pwdReveal); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-52 w-full" />)}
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
          <p className="text-sm text-muted-foreground">Admin not found</p>
        </div>
      </div>
    );
  }

  const actionBtn = 'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-50';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-border pb-6">
        <button
          onClick={() => router.push('/admin/dashboard/admins')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />Back to Admins
        </button>

        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Admin Profile</p>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0">
              {data.fullName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                {data.fullName}
                {isSelf && <span className="text-sm font-normal text-muted-foreground ml-2">(you)</span>}
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{data.adminCode}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <RolePill role={data.role} />
                <StatusPill status={data.status} />
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{data.loginCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Logins</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">
                {data.lastLoginAt
                  ? new Date(data.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Login</p>
            </div>
          </div>
        </div>

        {/* Action toolbar — only SUPER_ADMIN can manage admins */}
        {isSuper && (
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <button
              className={`${actionBtn} border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50`}
              onClick={handleResetPassword}
              disabled={busy}
            >
              <KeyRound className="h-3.5 w-3.5" />Reset Password
            </button>

            {!isSelf && (
              <button
                className={`${actionBtn} ${
                  data.status === 'ACTIVE'
                    ? 'border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10'
                    : 'border-primary/40 text-primary bg-primary/5 hover:bg-primary/10'
                }`}
                onClick={() => setBlockOpen(true)}
                disabled={busy}
              >
                {data.status === 'ACTIVE'
                  ? <><Ban className="h-3.5 w-3.5" />Block</>
                  : <><Power className="h-3.5 w-3.5" />Unblock</>}
              </button>
            )}

            {!isSelf && (
              <button
                className={`${actionBtn} border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10`}
                onClick={() => setDeleteOpen(true)}
                disabled={busy}
              >
                <Trash2 className="h-3.5 w-3.5" />Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Section title="Contact Details" icon={ShieldCheck}>
          <Row label="Full Name" value={data.fullName} />
          <Row label="Email"     value={<span className="font-mono">{data.email}</span>} />
          <Row label="Phone"     value={<span className="font-mono">{data.phone}</span>} />
        </Section>

        <Section title="Account" icon={Calendar}>
          <Row label="Admin ID"   value={<span className="font-mono">{data.adminCode}</span>} />
          <Row label="Role"       value={<RolePill role={data.role} />} />
          <Row label="Status"     value={<StatusPill status={data.status} />} />
          <Row label="Logins"     value={data.loginCount ?? 0} />
          <Row label="Last Login" value={
            data.lastLoginAt
              ? new Date(data.lastLoginAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'Never'
          } />
          <Row label="Joined" value={
            data.createdAt
              ? new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'
          } />
          {data.mustChangePassword && (
            <Row
              label="Password"
              value={
                <span className={`${PILL} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}>
                  Change required on next login
                </span>
              }
            />
          )}
        </Section>
      </div>

      {/* Block confirmation */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {data.status === 'ACTIVE' ? <Ban className="h-5 w-5 text-destructive" /> : <Power className="h-5 w-5 text-primary" />}
              {data.status === 'ACTIVE' ? 'Block Admin' : 'Unblock Admin'}
            </DialogTitle>
            <DialogDescription>
              {data.status === 'ACTIVE'
                ? `Block ${data.fullName}? Their session will be revoked and they cannot log in until unblocked.`
                : `Unblock ${data.fullName}? They will be able to log in again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button size="sm" variant={data.status === 'ACTIVE' ? 'destructive' : 'default'} onClick={handleToggleBlock}>
              {data.status === 'ACTIVE' ? 'Block' : 'Unblock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />Delete Admin
            </DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{data.fullName}</strong> ({data.email})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reveal */}
      <Dialog open={!!pwdReveal} onOpenChange={(o) => { if (!o) setPwdReveal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />Temporary Password
            </DialogTitle>
            <DialogDescription>
              Share with <strong>{data.fullName}</strong>. Shown <strong>once only</strong> — copy it now.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-base font-mono bg-muted px-3 py-2.5 rounded-md tracking-wide select-all">{pwdReveal}</code>
              <Button variant="outline" size="sm" onClick={copyPwd} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setPwdReveal(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

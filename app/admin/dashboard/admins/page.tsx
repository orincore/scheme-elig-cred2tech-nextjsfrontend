'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminAuthApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Plus, KeyRound, Power, Copy, Check, Lock, Ban, Trash2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const PILL = 'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full';

function RolePill({ role }: { role: string }) {
  return role === 'SUPER_ADMIN'
    ? <span className={`${PILL} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300`}>Super Admin</span>
    : <span className={`${PILL} bg-muted text-muted-foreground`}>Admin</span>;
}
function StatusPill({ status }: { status: string }) {
  const cls = status === 'ACTIVE'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : status === 'SUSPENDED'
    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return <span className={`${PILL} ${cls}`}>{status?.charAt(0) + status?.slice(1).toLowerCase()}</span>;
}

export default function AdminsPage() {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const isSuper = admin?.role === 'SUPER_ADMIN';

  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'ADMIN' });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // One-time password reveal
  const [pwdReveal, setPwdReveal] = useState<{ name: string; email?: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAuthApi.listAdmins();
      if (res.success) setAdmins(res.admins);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuper) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper]);

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const res = await adminAuthApi.createAdmin(form);
      if (res.success) {
        toast.success('Admin account created');
        setCreateOpen(false);
        setPwdReveal({ name: res.admin.fullName, email: res.admin.email, password: res.tempPassword });
        setForm({ fullName: '', email: '', phone: '', role: 'ADMIN' });
        load();
      } else {
        toast.error(res.message || 'Failed to create admin');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (a: any) => {
    const blocked = a.status !== 'ACTIVE';
    const next = blocked ? 'ACTIVE' : 'SUSPENDED';
    if (!blocked && !window.confirm(
      `Block ${a.fullName}? They will be logged out immediately and cannot take any further action until unblocked.`
    )) return;
    setBusyId(a.id);
    try {
      const res = await adminAuthApi.updateAdminStatus(a.id, next);
      if (res.success) { toast.success(`${a.fullName} ${blocked ? 'unblocked' : 'blocked — their session is now revoked'}`); load(); }
      else toast.error(res.message || 'Failed');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const deleteAdmin = async (a: any) => {
    if (!window.confirm(`Permanently delete ${a.fullName} (${a.email})? This cannot be undone — they lose all access immediately.`)) return;
    setBusyId(a.id);
    try {
      const res = await adminAuthApi.deleteAdmin(a.id);
      if (res.success) { toast.success(`${a.fullName} deleted`); load(); }
      else toast.error(res.message || 'Failed to delete');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete admin');
    } finally {
      setBusyId(null);
    }
  };

  const resetPwd = async (a: any) => {
    if (!window.confirm(`Reset password for ${a.fullName}? Their current password stops working.`)) return;
    setBusyId(a.id);
    try {
      const res = await adminAuthApi.resetAdminPassword(a.id);
      if (res.success) setPwdReveal({ name: a.fullName, email: a.email, password: res.tempPassword });
      else toast.error(res.message || 'Failed');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reset password');
    } finally {
      setBusyId(null);
    }
  };

  const copyPwd = async () => {
    if (!pwdReveal) return;
    try { await navigator.clipboard.writeText(pwdReveal.password); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  // ── Not authorized ──
  if (!isSuper && !loading) {
    return (
      <div className="bg-card border border-border rounded-none">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Super-admin access required</p>
          <p className="text-xs text-muted-foreground">Only super-admins can manage admin accounts.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Access Control</p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Admin Accounts</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage who can access the admin panel</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Admin
          </Button>
        </div>

        <div className="flex items-center gap-5 mt-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Total</p>
            <p className="text-2xl font-bold text-foreground">{admins.length}</p>
            <p className="text-xs text-muted-foreground">Admin accounts</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Super</p>
            <p className="text-2xl font-bold text-indigo-500">{admins.filter(a => a.role === 'SUPER_ADMIN').length}</p>
            <p className="text-xs text-muted-foreground">Super-admins</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Active</p>
            <p className="text-2xl font-bold text-green-500">{admins.filter(a => a.status === 'ACTIVE').length}</p>
            <p className="text-xs text-muted-foreground">Can log in</p>
          </div>
        </div>
      </div>

      {/* ─── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-background">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Admins ({admins.length})
          </h3>
        </div>
        <div className="overflow-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <colgroup>
              <col style={{ width: '28%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} /><col style={{ width: '16%' }} /><col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr className="bg-background border-b-2 border-border">
                {['Admin', 'Phone', 'Role', 'Status', 'Last Login', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const isSelf = String(a.id) === String(admin?.id);
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                          {a.fullName?.[0] || 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {a.fullName}{isSelf && <span className="text-[10px] text-muted-foreground font-normal"> (you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                          <p className="text-[10px] text-muted-foreground/70 font-mono">{a.adminCode || `ID ${a.id}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{a.phone || '—'}</td>
                    <td className="px-5 py-4"><RolePill role={a.role} /></td>
                    <td className="px-5 py-4"><StatusPill status={a.status} /></td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-foreground">{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString() : 'Never'}</p>
                      <p className="text-xs text-muted-foreground">{a.loginCount || 0} logins</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {a.adminCode && (
                          <button
                            onClick={() => router.push(`/admin/dashboard/admins/${a.adminCode}`)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />Profile
                          </button>
                        )}
                        <button
                          onClick={() => resetPwd(a)}
                          disabled={busyId === a.id}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                        >
                          <KeyRound className="h-3 w-3" />Reset
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => toggleStatus(a)}
                            disabled={busyId === a.id}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 ${
                              a.status === 'ACTIVE'
                                ? 'border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10'
                                : 'border-primary/40 text-primary bg-primary/5 hover:bg-primary/10'
                            }`}
                          >
                            {a.status === 'ACTIVE'
                              ? <><Ban className="h-3 w-3" />Block</>
                              : <><Power className="h-3 w-3" />Unblock</>}
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            onClick={() => deleteAdmin(a)}
                            disabled={busyId === a.id}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />Delete
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
      </div>

      {/* ─── Create dialog ────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!saving) setCreateOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Create Admin Account</DialogTitle>
            <DialogDescription>A one-time password will be generated and shown once after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Priya Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@cred2tech.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Admin'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── One-time password reveal ─────────────────────────────────────── */}
      <Dialog open={!!pwdReveal} onOpenChange={(o) => { if (!o) setPwdReveal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-500" />Temporary Password</DialogTitle>
            <DialogDescription>
              Share this with <strong>{pwdReveal?.name}</strong>{pwdReveal?.email ? ` (${pwdReveal.email})` : ''}. It is shown <strong>only once</strong> — copy it now.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-base font-mono bg-muted px-3 py-2.5 rounded-md tracking-wide select-all">{pwdReveal?.password}</code>
              <Button variant="outline" size="sm" onClick={copyPwd} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">The admin should log in with this and change it (or you can reset it again anytime).</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setPwdReveal(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminAuthApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, Phone, ShieldCheck, Pencil, Save, X, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const PILL = 'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full';

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        {value || <span className="text-muted-foreground/50">—</span>}
      </span>
    </div>
  );
}

export default function AdminProfilePage() {
  const { admin, refreshProfile, changePassword: ctxChangePassword } = useAdminAuth();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit personal info
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });

  // Change password
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAuthApi.getProfile();
      if (res.success) setProfile(res.admin);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = () => {
    setForm({ fullName: profile?.fullName || '', email: profile?.email || '', phone: profile?.phone || '' });
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const res = await adminAuthApi.updateProfile(form);
      if (res.success) {
        toast.success('Profile updated');
        setProfile((p: any) => ({ ...p, ...res.admin }));
        setEditing(false);
        await refreshProfile(); // refresh header/sidebar name
      } else {
        toast.error(res.message || 'Failed to update profile');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.oldPassword || !pwd.newPassword) { toast.error('Enter your current and new password'); return; }
    if (pwd.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwd.newPassword !== pwd.confirm) { toast.error('New password and confirmation do not match'); return; }
    setChangingPwd(true);
    try {
      const ok = await ctxChangePassword(pwd.oldPassword, pwd.newPassword);
      if (ok) {
        toast.success('Password changed — other devices have been signed out');
        setPwd({ oldPassword: '', newPassword: '', confirm: '' });
        setPwdOpen(false);
      } else {
        toast.error('Failed to change password');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Current password is incorrect');
    } finally {
      setChangingPwd(false);
    }
  };

  const roleLabel = (profile?.role || admin?.role || 'ADMIN').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-64" />
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <Skeleton className="h-56 md:col-span-2" /><Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">My Account</p>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shrink-0">
            {profile?.fullName?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{profile?.fullName || 'Admin'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              {profile?.email}
              <span className={`${PILL} ${profile?.role === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-muted text-muted-foreground'}`}>
                {roleLabel}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 items-start">
        {/* ── Personal information ── */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Personal Information
              </h3>
              {!editing ? (
                <button onClick={startEdit} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors">
                  <Pencil className="h-3 w-3" />Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    <Save className="h-3 w-3" />{saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} disabled={saving} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground transition-colors">
                    <X className="h-3 w-3" />Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="px-5 py-2">
              {editing ? (
                <div className="grid sm:grid-cols-2 gap-3 py-2">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your name" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@cred2tech.com" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" className="h-9 text-sm" />
                  </div>
                </div>
              ) : (
                <>
                  <InfoRow label="Name"  value={profile?.fullName} icon={User} />
                  <InfoRow label="Email" value={profile?.email} icon={Mail} />
                  <InfoRow label="Phone" value={profile?.phone} icon={Phone} />
                  <InfoRow label="Role"  value={roleLabel} icon={ShieldCheck} />
                </>
              )}
            </div>
          </div>

          {/* ── Security / password ── */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Security
              </h3>
              {!pwdOpen && (
                <button onClick={() => setPwdOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors">
                  <KeyRound className="h-3 w-3" />Change Password
                </button>
              )}
            </div>
            <div className="px-5 py-4">
              {!pwdOpen ? (
                <p className="text-sm text-muted-foreground">Your password is hidden for security. Change it anytime — you'll need to enter your current password first.</p>
              ) : (
                <div className="space-y-3 max-w-md">
                  <div className="space-y-1.5">
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input type={showOld ? 'text' : 'password'} value={pwd.oldPassword} onChange={(e) => setPwd({ ...pwd, oldPassword: e.target.value })} placeholder="Enter current password" className="h-9 text-sm pr-9" />
                      <button type="button" onClick={() => setShowOld((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input type={showNew ? 'text' : 'password'} value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} placeholder="At least 8 characters" className="h-9 text-sm pr-9" />
                      <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm New Password</Label>
                    <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="Re-enter new password" className="h-9 text-sm" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={changePassword} disabled={changingPwd}>{changingPwd ? 'Updating…' : 'Update Password'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setPwdOpen(false); setPwd({ oldPassword: '', newPassword: '', confirm: '' }); }} disabled={changingPwd}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Account meta ── */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-background">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Account
            </h3>
          </div>
          <div className="px-5 py-2">
            <InfoRow label="Admin ID" value={profile?.adminCode || (profile?.id != null ? `#${profile.id}` : undefined)} />
            <InfoRow label="Status"   value={profile?.status} />
            <InfoRow label="Logins"   value={String(profile?.loginCount ?? 0)} />
            <InfoRow label="Last Login" value={profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never'} />
            <InfoRow label="Joined"   value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

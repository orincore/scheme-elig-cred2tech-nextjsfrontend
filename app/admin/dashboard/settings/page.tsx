'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ShieldAlert, User, Eye, EyeOff, LogOut, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { admin, changePassword, logoutAllDevices } = useAdminAuth();

  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changing, setChanging] = useState(false);
  const [endingSessions, setEndingSessions] = useState(false);

  const roleLabel = (admin?.role || 'ADMIN').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const handleChangePassword = async () => {
    if (!pwd.oldPassword || !pwd.newPassword) { toast.error('Enter your current and new password'); return; }
    if (pwd.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwd.newPassword !== pwd.confirm) { toast.error('New password and confirmation do not match'); return; }
    setChanging(true);
    try {
      const ok = await changePassword(pwd.oldPassword, pwd.newPassword);
      if (ok) {
        toast.success('Password changed — other devices have been signed out');
        setPwd({ oldPassword: '', newPassword: '', confirm: '' });
      } else {
        toast.error('Failed to change password');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Current password is incorrect');
    } finally {
      setChanging(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('End all active sessions on every device? You will be logged out here too and must sign in again.')) return;
    setEndingSessions(true);
    try {
      await logoutAllDevices(); // revokes all sessions + redirects to login
    } catch (e: any) {
      toast.error(e?.message || 'Failed to end sessions');
      setEndingSessions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Preferences</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account security and sessions</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 items-start">
        {/* ── Left: security ── */}
        <div className="md:col-span-2 space-y-5">
          {/* Change password */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-background">
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Change Password
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3 max-w-md">
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
              <p className="text-xs text-muted-foreground">Your current password must be correct. Changing it signs you out of all other devices.</p>
              <Button size="sm" onClick={handleChangePassword} disabled={changing}>{changing ? 'Updating…' : 'Change Password'}</Button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-card border border-destructive/30 rounded-none overflow-hidden">
            <div className="px-5 py-3.5 border-b border-destructive/30 bg-destructive/5">
              <h3 className="text-[13px] font-bold text-destructive flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Danger Zone
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Irreversible actions for your account</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-foreground">Logout from all devices</p>
                  <p className="text-xs text-muted-foreground mt-0.5">End every active session (including this one). All current tokens stop working immediately.</p>
                </div>
                <button
                  onClick={handleLogoutAll}
                  disabled={endingSessions}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 disabled:opacity-60 transition-colors shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {endingSessions ? 'Ending…' : 'End all sessions'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: account summary ── */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Account
            </h3>
            <Link href="/admin/dashboard/profile" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
              Edit <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="px-5 py-2">
            {[
              { label: 'Name', value: admin?.fullName },
              { label: 'Email', value: admin?.email },
              { label: 'Phone', value: admin?.phone },
              { label: 'Role', value: roleLabel },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-4 py-2.5 border-b border-border last:border-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] w-20 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-foreground flex-1">{value || <span className="text-muted-foreground/50">—</span>}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border bg-background">
            <p className="text-[11px] text-muted-foreground">Manage your name, email and phone on the Profile page.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

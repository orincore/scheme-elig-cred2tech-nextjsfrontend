'use client';

import { useState } from 'react';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { agentAuthApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LogoutConfirmDialog } from '@/components/ui/logout-confirm-dialog';
import { Bell, Lock, Globe, LogOut, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function SectionHeader({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="px-5 py-3.5 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
      </div>
      {description && <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">{description}</p>}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div>
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function AgentSettingsPage() {
  const { agent, logout } = useAgentAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Notification toggles (UI-only — no backend for these yet)
  const [notif, setNotif] = useState({ email: true, sms: false, push: true });

  // Password change
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const changePassword = async () => {
    if (!pwd.current || !pwd.next) { toast.error('Enter your current and new password'); return; }
    if (pwd.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwd.next !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    setChangingPwd(true);
    try {
      const res = await agentAuthApi.changePassword(pwd.current, pwd.next);
      if (res.success) {
        toast.success('Password changed successfully');
        setPwd({ current: '', next: '', confirm: '' });
      } else {
        toast.error(res.message || 'Failed to change password');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Current password is incorrect');
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">Preferences</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 items-start">
        {/* Notifications */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <SectionHeader icon={Bell} title="Notifications" description="Control how you receive alerts" />
          <div className="px-5 py-3">
            <ToggleRow label="Email Notifications" description="Case updates and status changes via email" checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} />
            <ToggleRow label="SMS Notifications" description="Urgent alerts via SMS" checked={notif.sms} onChange={(v) => setNotif({ ...notif, sms: v })} />
            <ToggleRow label="Push Notifications" description="Browser push notifications" checked={notif.push} onChange={(v) => setNotif({ ...notif, push: v })} />
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card border border-border rounded-none overflow-hidden">
          <SectionHeader icon={Lock} title="Change Password" description="Update your account password" />
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <div className="relative">
                <Input type={showCur ? 'text' : 'password'} value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} placeholder="Enter current password" className="h-9 text-sm pr-9" />
                <button type="button" onClick={() => setShowCur((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showNew ? 'text' : 'password'} value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="At least 8 characters" className="h-9 text-sm pr-9" />
                <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="Re-enter new password" className="h-9 text-sm" />
            </div>
            <Button size="sm" onClick={changePassword} disabled={changingPwd} className="mt-1">
              {changingPwd ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-destructive/40 rounded-none overflow-hidden">
        <div className="px-5 py-3.5 border-b border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-destructive" />
            <h3 className="text-[13px] font-bold text-destructive">Danger Zone</h3>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Sign Out</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">End your current session</p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setLogoutOpen(true)} className="gap-2">
            <LogOut className="h-3.5 w-3.5" />Logout
          </Button>
        </div>
      </div>

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={logout} />
    </div>
  );
}

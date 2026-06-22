'use client';

import { useEffect, useState } from 'react';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import { agentAuthApi } from '@/lib/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, Phone, MapPin, Star, ShieldCheck, Pencil, Save, X, Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const PILL = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full';

function AvailPill({ a }: { a: string }) {
  const cls =
    a === 'AVAILABLE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
    a === 'BUSY'      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
    a === 'OFFLINE'   ? 'bg-muted text-muted-foreground' :
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  return <span className={`${PILL} ${cls}`}>{a?.replace(/_/g, ' ')}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide min-w-[130px] shrink-0 pt-0.5">{label}</span>
      <span className="text-[13px] text-foreground flex-1">{value ?? <span className="text-muted-foreground/40">—</span>}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, action }: { icon: any; title: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 border-b border-border bg-background flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-[13px] font-bold text-foreground flex-1">{title}</h3>
      {action}
    </div>
  );
}

export default function AgentProfilePage() {
  const { agent } = useAgentAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', region: '', availability: 'AVAILABLE', gender: '', city: '', state: '', pincode: '', supportedSchemes: [] as string[] });
  const [schemeInput, setSchemeInput] = useState('');

  // Password change
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (agent) {
      setForm({
        fullName: agent.fullName || '',
        phone: agent.phone || '',
        region: agent.region || '',
        availability: agent.availability || 'AVAILABLE',
        gender: agent.gender || '',
        city: agent.city || '',
        state: agent.state || '',
        pincode: agent.pincode || '',
        supportedSchemes: agent.supportedSchemes || [],
      });
    }
  }, [agent]);

  const startEdit = () => setEditing(true);
  const cancelEdit = () => {
    setEditing(false);
    if (agent) setForm({ fullName: agent.fullName || '', phone: agent.phone || '', region: agent.region || '', availability: agent.availability || 'AVAILABLE', gender: agent.gender || '', city: agent.city || '', state: agent.state || '', pincode: agent.pincode || '', supportedSchemes: agent.supportedSchemes || [] });
    setSchemeInput('');
  };

  const saveProfile = async () => {
    if (!form.fullName.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    try {
      const res = await agentAuthApi.updateProfile({ ...form, supportedSchemes: form.supportedSchemes });
      if (res.success) {
        toast.success('Profile updated');
        setEditing(false);
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
    if (!pwd.current || !pwd.next) { toast.error('Enter your current and new password'); return; }
    if (pwd.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwd.next !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    setChangingPwd(true);
    try {
      const res = await agentAuthApi.changePassword(pwd.current, pwd.next);
      if (res.success) {
        toast.success('Password changed successfully');
        setPwd({ current: '', next: '', confirm: '' });
        setPwdOpen(false);
      } else {
        toast.error(res.message || 'Failed to change password');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Current password is incorrect');
    } finally {
      setChangingPwd(false);
    }
  };

  if (!agent) {
    return (
      <div className="space-y-6">
        <div className="border-b-2 border-border pb-6 space-y-3">
          <Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-48" />
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <Skeleton className="h-56 md:col-span-2" /><Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-border pb-6">
        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">My Account</p>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shrink-0">
            {agent.fullName?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{agent.fullName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              <span className="font-mono">{agent.employeeId}</span>
              <AvailPill a={agent.availability} />
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 items-start">
        {/* Personal info */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader
              icon={User}
              title="Personal Information"
              action={!editing
                ? <button onClick={startEdit} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"><Pencil className="h-3 w-3" />Edit</button>
                : <div className="flex items-center gap-2">
                    <button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"><Save className="h-3 w-3" />{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={cancelEdit} disabled={saving} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground transition-colors"><X className="h-3 w-3" />Cancel</button>
                  </div>
              }
            />
            <div className="px-5 py-3">
              {editing ? (
                <div className="grid sm:grid-cols-2 gap-3 py-2">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-9 text-sm" placeholder="e.g. Pune" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="h-9 text-sm" placeholder="e.g. Maharashtra" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pincode</Label>
                    <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="h-9 text-sm" placeholder="6-digit pincode" maxLength={6} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Region</Label>
                    <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Availability</Label>
                    <select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="AVAILABLE">Available</option>
                      <option value="BUSY">Busy</option>
                      <option value="OFFLINE">Offline</option>
                      <option value="ON_LEAVE">On Leave</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Supported Schemes</Label>
                    <p className="text-[11px] text-muted-foreground">Add scheme IDs/names you handle. Only cases matching these schemes will be assigned to you.</p>
                    <div className="flex gap-2">
                      <Input
                        value={schemeInput}
                        onChange={(e) => setSchemeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && schemeInput.trim()) {
                            e.preventDefault();
                            const val = schemeInput.trim();
                            if (!form.supportedSchemes.includes(val)) setForm({ ...form, supportedSchemes: [...form.supportedSchemes, val] });
                            setSchemeInput('');
                          }
                        }}
                        className="h-9 text-sm"
                        placeholder="Type scheme name and press Enter…"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = schemeInput.trim();
                          if (val && !form.supportedSchemes.includes(val)) setForm({ ...form, supportedSchemes: [...form.supportedSchemes, val] });
                          setSchemeInput('');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />Add
                      </button>
                    </div>
                    {form.supportedSchemes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.supportedSchemes.map((s) => (
                          <span key={s} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {s}
                            <button type="button" onClick={() => setForm({ ...form, supportedSchemes: form.supportedSchemes.filter((x) => x !== s) })} className="hover:text-destructive transition-colors"><Trash2 className="h-2.5 w-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <InfoRow label="Full Name"    value={agent.fullName} />
                  <InfoRow label="Email"        value={<span className="font-mono">{agent.email}</span>} />
                  <InfoRow label="Phone"        value={<span className="font-mono">{agent.phone}</span>} />
                  <InfoRow label="City"         value={agent.city} />
                  <InfoRow label="State"        value={agent.state} />
                  <InfoRow label="Pincode"      value={agent.pincode} />
                  <InfoRow label="Region"       value={agent.region} />
                  <InfoRow label="Gender"       value={agent.gender} />
                  <InfoRow label="Availability" value={<AvailPill a={agent.availability} />} />
                  <InfoRow
                    label="Supported Schemes"
                    value={
                      agent.supportedSchemes?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {agent.supportedSchemes.map((s: string) => (
                            <span key={s} className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 italic text-xs">All schemes (none specified)</span>
                      )
                    }
                  />
                </>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader
              icon={KeyRound}
              title="Security"
              action={!pwdOpen
                ? <button onClick={() => setPwdOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"><KeyRound className="h-3 w-3" />Change Password</button>
                : null
              }
            />
            <div className="px-5 py-4">
              {!pwdOpen ? (
                <p className="text-sm text-muted-foreground">Your password is hidden. Change it anytime — you'll need your current password first.</p>
              ) : (
                <div className="space-y-3 max-w-md">
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
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={changePassword} disabled={changingPwd}>{changingPwd ? 'Updating…' : 'Update Password'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setPwdOpen(false); setPwd({ current: '', next: '', confirm: '' }); }} disabled={changingPwd}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — account meta + expertise */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader icon={ShieldCheck} title="Account" />
            <div className="px-5 py-3">
              <InfoRow label="Employee ID"  value={<span className="font-mono">{agent.employeeId}</span>} />
              <InfoRow label="Availability" value={<AvailPill a={agent.availability} />} />
              <InfoRow label="Status"       value={agent.approvalStatus} />
              <InfoRow label="Joined"       value={agent.createdAt ? new Date(agent.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-none overflow-hidden">
            <SectionHeader icon={Star} title="Expertise" />
            <div className="px-5 py-4">
              {agent.expertise?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {agent.expertise.map((e: string) => (
                    <span key={e} className="text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">{e}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic mb-3">No expertise listed</p>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Certifications</p>
              {agent.certifications?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {agent.certifications.map((c: string) => (
                    <span key={c} className="text-[11px] font-semibold bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{c}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">No certifications listed</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

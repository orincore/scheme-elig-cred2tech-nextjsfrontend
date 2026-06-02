'use client';

import { useEffect, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { LogoutConfirmDialog } from '@/components/ui/logout-confirm-dialog';
import { toast } from 'sonner';
import {
  User, Mail, Phone, Building2, MapPin, Trash2, LogOut,
  Pencil, Save, X, AlertCircle, ClipboardList, IndianRupee,
  Plus, Check, Loader2, ShieldCheck, ShieldOff, Lock,
} from 'lucide-react';
import { casesApi } from '@/lib/services/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const SECTOR_OPTIONS = [
  { value: 'finance',       label: 'Finance, Banking, Fintech & Professional Services' },
  { value: 'technology',    label: 'IT / Software / Technology / ITES' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail',        label: 'Retail / Trading / Wholesale' },
  { value: 'services',      label: 'Other Services (Consulting, Admin, etc.)' },
  { value: 'healthcare',    label: 'Healthcare & Pharma' },
  { value: 'education',     label: 'Education & Training' },
  { value: 'construction',  label: 'Construction & Real Estate' },
  { value: 'transport',     label: 'Transportation & Logistics' },
  { value: 'agro',          label: 'Agriculture, Food Processing & Dairy' },
  { value: 'textile',       label: 'Textile & Apparel' },
  { value: 'handicraft',    label: 'Handicraft & Artisan' },
  { value: 'fisheries',     label: 'Fisheries & Aquaculture' },
  { value: 'ecommerce',     label: 'E-Commerce' },
  { value: 'energy',        label: 'Energy & Renewables' },
  { value: 'hospitality',   label: 'Hospitality & Tourism' },
  { value: 'media',         label: 'Media & Entertainment' },
];

const ENTERPRISE_CATEGORY_OPTIONS = [
  { value: 'micro',  label: 'Micro' },
  { value: 'small',  label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large' },
];

const CASTE_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'OBC',     label: 'OBC' },
  { value: 'SC',      label: 'SC' },
  { value: 'ST',      label: 'ST' },
  { value: 'EWS',     label: 'EWS' },
];

const GENDER_OPTIONS = [
  { value: 'Male',        label: 'Male' },
  { value: 'Female',      label: 'Female' },
  { value: 'Transgender', label: 'Transgender' },
];

const RESIDENCE_OPTIONS = [
  { value: 'Rural', label: 'Rural' },
  { value: 'Urban', label: 'Urban' },
];

const YESNO_FIELDS: { key: string; label: string }[] = [
  { key: 'isStartup',         label: 'Startup (DPIIT recognised)' },
  { key: 'udyamRegistered',   label: 'Udyam Registered' },
  { key: 'differently_abled', label: 'Differently Abled (Disability)' },
  { key: 'minority',          label: 'Minority' },
  { key: 'bpl',               label: 'Below Poverty Line (BPL)' },
  { key: 'isWomenLed',        label: 'Women-led Enterprise' },
  { key: 'isExServiceman',    label: 'Ex-Serviceman' },
];

function yesNoLabel(v: any): string {
  if (v === true)  return 'Yes';
  if (v === false) return 'No';
  return '—';
}

const VAGUE_SECTORS = new Set(['professional_services', 'other', 'administrative', 'public_admin', '']);
function needsSectorClarification(sector: string | null | undefined): boolean {
  if (!sector) return true;
  return VAGUE_SECTORS.has(sector) || !SECTOR_OPTIONS.some(o => o.value === sector);
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionBox({
  title, icon: Icon, actions, children,
}: {
  title: string; icon: React.ElementType; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  const display = children ?? (value || <span className="text-muted-foreground/50">—</span>);
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] w-40 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1">{display}</span>
    </div>
  );
}

const SELECT_CLS = 'w-full h-9 px-3 bg-background border border-border text-foreground text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary';

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors">
      <Pencil className="h-3 w-3" />Edit
    </button>
  );
}

function SaveCancelBtns({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <>
      <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button onClick={onCancel} disabled={saving} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground transition-colors">
        <X className="h-3 w-3" />Cancel
      </button>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const {
    token, userId, logout, userProfile, mobile, isInitialized,
    businesses, activeBusinessId, setActiveBusiness, startAddBusiness, refreshBusinesses,
  } = useMsmeAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [logoutOpen, setLogoutOpen]   = useState(false);

  const [isEditing, setIsEditing]   = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [editName, setEditName]     = useState('');
  const [editEmail, setEditEmail]   = useState('');

  const [isSectorEditing, setIsSectorEditing]   = useState(false);
  const [editSector, setEditSector]             = useState('');
  const [isSavingSector, setIsSavingSector]     = useState(false);

  const [isEligEditing, setIsEligEditing]   = useState(false);
  const [isSavingElig, setIsSavingElig]     = useState(false);
  const [eligForm, setEligForm]             = useState<Record<string, any>>({});

  const [isSwitching, setIsSwitching] = useState(false);
  const [hasCases, setHasCases]       = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!token) router.push('/');
  }, [token, router, isInitialized]);

  const loadProfile = async () => {
    if (!token) { setIsLoading(false); return; }
    const mobileNumber = userProfile?.mobile || mobile;
    if (!mobileNumber) { setIsLoading(false); return; }
    try {
      const res  = await fetch(`${API_BASE_URL}/api/msme-auth/profile/${mobileNumber}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setProfileData(data.user);
    } catch { toast.error('Failed to load profile data'); }
    finally   { setIsLoading(false); }
  };

  useEffect(() => {
    loadProfile();
    refreshBusinesses();
    // Check whether this user has any submitted cases — used to lock business removal
    if (userId) {
      casesApi.getMsmeCases(parseInt(userId))
        .then(res => { if (res.success && (res.cases?.length ?? 0) > 0) setHasCases(true); })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userProfile, mobile]);

  const handleSwitchBusiness = async (id: number) => {
    if (id === activeBusinessId) return;
    setIsSwitching(true);
    const ok = await setActiveBusiness(id);
    setIsSwitching(false);
    if (ok) { await loadProfile(); toast.success('Switched business'); }
    else toast.error('Could not switch business');
  };

  const handleDeleteBusiness = async (id: number) => {
    const business = businesses?.find(b => b.id === id);
    const hasRealData = !!(business?.panNumber && business.panNumber.trim());
    if (hasCases && hasRealData) {
      toast.error('Cannot remove a verified business while you have submitted applications. Contact support.');
      return;
    }
    if (!window.confirm('Remove this business profile? Its scheme results will be discarded.')) return;
    try {
      const res  = await fetch(`${API_BASE_URL}/api/msme-auth/businesses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { toast.success('Business removed'); await refreshBusinesses(); await loadProfile(); }
      else toast.error(data.message || 'Failed to remove business');
    } catch { toast.error('Failed to remove business'); }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/msme-auth/profile`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName, email: editEmail }) });
      const data = await res.json();
      if (data.success) { setProfileData((p: any) => ({ ...p, name: editName, email: editEmail })); setIsEditing(false); toast.success('Profile updated'); }
      else toast.error(data.message || 'Failed to update profile');
    } catch { toast.error('Failed to update profile'); }
    finally { setIsSaving(false); }
  };

  const handleSaveSector = async () => {
    if (!editSector) { toast.error('Please select a sector'); return; }
    setIsSavingSector(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/msme-auth/profile/eligibility`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ businessSector: editSector, businessId: activeBusinessId ?? undefined }) });
      const data = await res.json();
      if (data.success) { setProfileData((p: any) => ({ ...p, businessSector: editSector })); setIsSectorEditing(false); toast.success('Industry sector updated'); }
      else toast.error(data.message || 'Failed to update sector');
    } catch { toast.error('Failed to update sector'); }
    finally { setIsSavingSector(false); }
  };

  const handleEligEditStart = () => {
    setEligForm({
      enterpriseCategory: profileData?.enterpriseCategory ?? '',
      annualTurnoverLakhs: profileData?.annualTurnoverLakhs ?? '',
      annualIncomeLakhs: profileData?.annualIncomeLakhs ?? '',
      caste: profileData?.caste ?? '',
      gender: profileData?.gender ?? '',
      ruralUrban: profileData?.ruralUrban ?? '',
      isStartup: profileData?.isStartup ?? null,
      udyamRegistered: profileData?.udyamRegistered ?? null,
      differently_abled: profileData?.differently_abled ?? null,
      minority: profileData?.minority ?? null,
      bpl: profileData?.bpl ?? null,
      isWomenLed: profileData?.isWomenLed ?? null,
      isExServiceman: profileData?.isExServiceman ?? null,
    });
    setIsEligEditing(true);
  };

  const setEligField = (key: string, value: any) => setEligForm(p => ({ ...p, [key]: value }));

  const handleSaveElig = async () => {
    setIsSavingElig(true);
    try {
      const payload: Record<string, any> = {};
      for (const k of ['enterpriseCategory', 'caste', 'gender', 'ruralUrban']) {
        if (eligForm[k] !== '' && eligForm[k] != null) payload[k] = eligForm[k];
      }
      for (const k of ['annualTurnoverLakhs', 'annualIncomeLakhs']) {
        if (eligForm[k] !== '' && eligForm[k] != null) { const n = Number(eligForm[k]); if (!Number.isNaN(n)) payload[k] = n; }
      }
      for (const { key } of YESNO_FIELDS) {
        if (eligForm[key] === true || eligForm[key] === false) payload[key] = eligForm[key];
      }
      if (activeBusinessId) payload.businessId = activeBusinessId;

      const res  = await fetch(`${API_BASE_URL}/api/msme-auth/profile/eligibility`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { setProfileData((p: any) => ({ ...p, ...payload })); setIsEligEditing(false); toast.success('Eligibility details updated'); }
      else toast.error(data.message || 'Failed to update details');
    } catch { toast.error('Failed to update details'); }
    finally { setIsSavingElig(false); }
  };

  const doLogout = () => { logout(); router.push('/'); };

  const handleDeleteAccount = async () => {
    if (!userId) { toast.error('User ID not found'); return; }
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/msme-auth/delete/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { toast.success('Account deleted'); logout(); router.push('/'); }
      else throw new Error(data.message || 'Failed to delete account');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete account'); }
    finally { setIsDeleting(false); }
  };

  if (!token) return null;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-5">
          <div className="border-b-2 border-border pb-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const sectorNeedsClarification = needsSectorClarification(profileData?.businessSector);
  const currentSectorLabel       = SECTOR_OPTIONS.find(o => o.value === profileData?.businessSector)?.label;
  const displayName              = profileData?.name || profileData?.legalNameOfBusiness || userProfile?.name || '—';
  const displayMobile            = profileData?.mobileNumber || userProfile?.mobile || '—';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* ─── Page Header ──────────────────────────────────────────────── */}
        <div className="border-b-2 border-border pb-5">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">My Account</p>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{displayName}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {displayMobile}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogoutOpen(true)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md border border-border text-muted-foreground bg-muted/20 hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />Logout
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 disabled:opacity-60 transition-colors"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {isDeleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>

          {/* Inline stats */}
          <div className="flex items-center gap-5 mt-5 flex-wrap">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">PAN</p>
              <p className="text-base font-bold text-foreground">{profileData?.panNumber || userProfile?.pan || '—'}</p>
              <p className="text-xs text-muted-foreground">
                {profileData?.panVerified
                  ? <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Verified</span>
                  : <span className="text-muted-foreground flex items-center gap-1"><ShieldOff className="h-3 w-3" />Not verified</span>}
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Businesses</p>
              <p className="text-base font-bold text-foreground">{businesses?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Profiles</p>
            </div>
            {profileData?.principalState && (
              <>
                <div className="w-px h-10 bg-border" />
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">State</p>
                  <p className="text-base font-bold text-foreground">{profileData.principalState}</p>
                  <p className="text-xs text-muted-foreground">{profileData.principalCity || 'Location'}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Sector clarification banner ──────────────────────────────── */}
        {profileData?.panVerified && sectorNeedsClarification && !isSectorEditing && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/60 rounded-none">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Industry sector needs clarification</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your GST data shows <span className="font-medium text-foreground">&quot;{profileData?.businessSector || 'unknown'}&quot;</span> which is too broad. Select your actual industry for accurate scheme matching.
              </p>
            </div>
            <button
              onClick={() => { setEditSector(''); setIsSectorEditing(true); }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 shrink-0 transition-colors"
            >
              Fix Now
            </button>
          </div>
        )}

        {/* ─── Two-column layout ────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-5 items-start">

          {/* ── Left: profile sections (2 cols) ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Personal Information */}
            <SectionBox
              title="Personal Information"
              icon={User}
              actions={!isEditing
                ? <EditBtn onClick={() => { setEditName(profileData?.name || ''); setEditEmail(profileData?.email || ''); setIsEditing(true); }} />
                : <SaveCancelBtns onSave={handleSaveProfile} onCancel={() => setIsEditing(false)} saving={isSaving} />
              }
            >
              {isEditing ? (
                <div className="grid sm:grid-cols-2 gap-3 py-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">Name</label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">Email</label>
                    <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Your email" type="email" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">Mobile</label>
                    <Input value={displayMobile} disabled className="h-9 text-sm opacity-60" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">PAN</label>
                    <Input value={profileData?.panNumber || userProfile?.pan || ''} disabled className="h-9 text-sm opacity-60 font-mono" />
                  </div>
                </div>
              ) : (
                <>
                  <InfoRow label="Name"   value={profileData?.name || profileData?.legalNameOfBusiness || userProfile?.name} />
                  <InfoRow label="Mobile" value={displayMobile} />
                  <InfoRow label="Email"  value={profileData?.email || userProfile?.email} />
                  <InfoRow label="PAN"    value={profileData?.panNumber || userProfile?.pan} />
                </>
              )}
            </SectionBox>

            {/* Business Information */}
            {profileData?.panVerified && (
              <SectionBox title="Business Information" icon={Building2}>
                <InfoRow label="Legal Name"    value={profileData?.legalNameOfBusiness} />
                <InfoRow label="Trade Name"    value={profileData?.tradeNameOfBusiness} />
                <InfoRow label="GSTIN"         value={profileData?.gstin} />
                <InfoRow label="Constitution"  value={profileData?.constitutionOfBusiness} />
                <InfoRow label="Business Type" value={profileData?.businessType} />

                {/* Industry sector — inline editable */}
                <div className="flex items-start gap-4 py-2.5 border-b border-border last:border-0">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] w-40 shrink-0 pt-0.5">
                    Industry
                    {sectorNeedsClarification && <span className="ml-1 text-amber-500">⚠</span>}
                  </span>
                  {isSectorEditing ? (
                    <div className="flex-1 space-y-2">
                      <select value={editSector} onChange={e => setEditSector(e.target.value)} className={SELECT_CLS}>
                        <option value="">Select your industry</option>
                        {SECTOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <SaveCancelBtns onSave={handleSaveSector} onCancel={() => setIsSectorEditing(false)} saving={isSavingSector} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-sm text-foreground">{currentSectorLabel || profileData?.businessSector || <span className="text-muted-foreground/50">—</span>}</span>
                      <button
                        onClick={() => { setEditSector(sectorNeedsClarification ? '' : (profileData?.businessSector || '')); setIsSectorEditing(true); }}
                        className="text-[11px] font-semibold text-primary hover:underline shrink-0"
                      >
                        {sectorNeedsClarification ? 'Set sector' : 'Change'}
                      </button>
                    </div>
                  )}
                </div>
              </SectionBox>
            )}

            {/* Address Information */}
            {profileData?.panVerified && (
              <SectionBox title="Address Information" icon={MapPin}>
                <InfoRow label="Address"  value={profileData?.principalAddress} />
                <InfoRow label="City"     value={profileData?.principalCity} />
                <InfoRow label="District" value={profileData?.principalDistrict} />
                <InfoRow label="State"    value={profileData?.principalState || profileData?.state} />
                <InfoRow label="Pincode"  value={profileData?.principalPincode} />
              </SectionBox>
            )}
          </div>

          {/* ── Right: businesses sidebar ── */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-none overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Your Businesses
                </h3>
                <button
                  onClick={startAddBusiness}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-3 w-3" />Add
                </button>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {(businesses || []).length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">No businesses yet.</p>
                )}
                {(businesses || []).map((b) => {
                  const isActive = b.id === activeBusinessId;
                  const bizName  = b.legalNameOfBusiness || b.tradeNameOfBusiness || b.panNumber || `Business #${b.id}`;
                  const bizSub   = [b.panNumber, b.constitutionOfBusiness, b.principalState || b.state].filter(Boolean).join(' · ');
                  return (
                    <div
                      key={b.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-md border transition-colors ${isActive ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/20'}`}
                    >
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground truncate">{bizName}</p>
                        {bizSub && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{bizSub}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
                              <Check className="w-3 h-3" />Active
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSwitchBusiness(b.id)}
                              disabled={isSwitching}
                              className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-60"
                            >
                              Switch
                            </button>
                          )}
                          {(businesses?.length || 0) > 1 && (() => {
                            // Only lock businesses that have real data (a PAN number).
                            // Empty placeholder businesses (no PAN) can always be deleted.
                            const hasRealData = !!(b.panNumber && b.panNumber.trim());
                            const isLocked = hasCases && hasRealData;
                            if (isLocked) {
                              return (
                                <span
                                  title="Cannot remove a verified business while you have submitted applications"
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/60 cursor-not-allowed select-none"
                                >
                                  <Lock className="w-3 h-3" />
                                  Locked
                                </span>
                              );
                            }
                            return (
                              <button
                                onClick={() => handleDeleteBusiness(b.id)}
                                className="text-[10px] font-semibold text-destructive hover:underline"
                              >
                                Remove
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-border bg-background space-y-2">
                <p className="text-[11px] text-muted-foreground">Each business is matched for schemes independently.</p>
                {hasCases && (businesses || []).some(b => !!(b.panNumber && b.panNumber.trim())) && (
                  <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                    <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      Verified businesses are locked because you have submitted applications. Contact support to make changes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Eligibility & Additional Details ─────────────────────────── */}
        <SectionBox
          title="Eligibility & Additional Details"
          icon={ClipboardList}
          actions={!isEligEditing
            ? <EditBtn onClick={handleEligEditStart} />
            : <SaveCancelBtns onSave={handleSaveElig} onCancel={() => setIsEligEditing(false)} saving={isSavingElig} />
          }
        >
          <p className="text-xs text-muted-foreground py-2 border-b border-border mb-1">
            These fields directly affect which government schemes you match. Keep them accurate.
          </p>
          <div className="grid sm:grid-cols-2 gap-x-8">

            {/* Numeric + select fields */}
            {[
              { key: 'enterpriseCategory', label: 'Enterprise Category', type: 'select', opts: ENTERPRISE_CATEGORY_OPTIONS },
              { key: 'annualTurnoverLakhs', label: 'Annual Turnover (Lakhs)', type: 'number' },
              { key: 'annualIncomeLakhs',   label: 'Annual Income (Lakhs)',   type: 'number' },
              { key: 'caste',     label: 'Caste / Social Category', type: 'select', opts: CASTE_OPTIONS },
              { key: 'gender',    label: 'Gender',                  type: 'select', opts: GENDER_OPTIONS },
              { key: 'ruralUrban',label: 'Residence',               type: 'select', opts: RESIDENCE_OPTIONS },
            ].map(({ key, label, type, opts }) => (
              <div key={key} className="flex items-start gap-4 py-2.5 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] w-40 shrink-0 pt-0.5">{label}</span>
                {isEligEditing ? (
                  type === 'select' ? (
                    <select
                      value={eligForm[key] ?? ''}
                      onChange={e => setEligField(key, e.target.value)}
                      className={SELECT_CLS + ' flex-1'}
                    >
                      <option value="">Select</option>
                      {(opts || []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input
                      type="number" min="0" step="0.01"
                      value={eligForm[key] ?? ''}
                      onChange={e => setEligField(key, e.target.value)}
                      className="h-9 text-sm flex-1"
                      placeholder="e.g. 25"
                    />
                  )
                ) : (
                  <span className="text-sm text-foreground flex-1 flex items-center gap-1">
                    {(key === 'annualTurnoverLakhs' || key === 'annualIncomeLakhs') && profileData?.[key] != null && profileData?.[key] !== '' && (
                      <IndianRupee className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    {profileData?.[key] != null && profileData?.[key] !== ''
                      ? (key === 'annualTurnoverLakhs' || key === 'annualIncomeLakhs')
                        ? `${profileData[key]} Lakhs`
                        : String(profileData[key])
                      : <span className="text-muted-foreground/50">—</span>}
                  </span>
                )}
              </div>
            ))}

            {/* Yes/No boolean fields */}
            {YESNO_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-start gap-4 py-2.5 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] w-40 shrink-0 pt-0.5">{label}</span>
                {isEligEditing ? (
                  <select
                    value={eligForm[key] === true ? 'yes' : eligForm[key] === false ? 'no' : ''}
                    onChange={e => setEligField(key, e.target.value === '' ? null : e.target.value === 'yes')}
                    className={SELECT_CLS + ' flex-1'}
                  >
                    <option value="">Not specified</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                ) : (
                  <span className={`text-sm flex-1 font-medium ${
                    profileData?.[key] === true  ? 'text-green-600 dark:text-green-400' :
                    profileData?.[key] === false ? 'text-muted-foreground' :
                    'text-muted-foreground/50'
                  }`}>
                    {yesNoLabel(profileData?.[key])}
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionBox>

      </div>

      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={doLogout} />
    </DashboardLayout>
  );
}

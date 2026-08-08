'use client';

import { useEffect } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { useSchemes } from '@/contexts/SchemesContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SavedSchemesList from '@/components/dashboard/SavedSchemesList';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function SavedSchemesPage() {
  const { isInitialized, authStep } = useMsmeAuth();
  const { getSavedSchemes, savedSchemes } = useSchemes();
  const router = useRouter();

  useEffect(() => {
    // Wait for session restore to finish — otherwise a direct URL load can
    // redirect an already-logged-in user before the token has been restored.
    if (!isInitialized) return;
    const token = sessionStorage.getItem('msme_auth_token');
    if (!token && authStep !== 'authenticated') router.push('/');
  }, [isInitialized, authStep, router]);

  useEffect(() => {
    if (authStep === 'authenticated') getSavedSchemes();
  }, [authStep]);

  if (authStep !== 'authenticated') return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ─── Page Header ─────────────────────────────────────────────── */}
        <div className="border-b-2 border-border pb-6">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mb-1.5">
            My Library
          </p>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Saved Schemes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Schemes you've bookmarked for later review or application
              </p>
            </div>
            <Button size="sm" onClick={() => router.push('/dashboard')}>
              Browse Schemes
            </Button>
          </div>

          {/* Inline stats */}
          <div className="flex items-center gap-5 mt-6 flex-wrap">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Saved</p>
              <p className="text-2xl font-bold text-foreground">{savedSchemes.length}</p>
              <p className="text-xs text-muted-foreground">Total schemes</p>
            </div>
            {savedSchemes.length > 0 && (
              <>
                <div className="w-px h-10 bg-border" />
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Ministries</p>
                  <p className="text-2xl font-bold text-foreground">
                    {new Set(savedSchemes.map(s => s.nodalMinistryName).filter(Boolean)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Unique ministries</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">Central</p>
                  <p className="text-2xl font-bold text-foreground">
                    {savedSchemes.filter(s => s.schemeLevel?.toLowerCase().includes('central')).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Central govt.</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-0.5">State</p>
                  <p className="text-2xl font-bold text-foreground">
                    {savedSchemes.filter(s => s.schemeLevel?.toLowerCase().includes('state')).length}
                  </p>
                  <p className="text-xs text-muted-foreground">State govt.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── List ────────────────────────────────────────────────────── */}
        <SavedSchemesList schemes={savedSchemes} />
      </div>
    </DashboardLayout>
  );
}

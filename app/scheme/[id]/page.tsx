'use client';

import { useEffect, useState } from 'react';
import { useMsmeAuth } from '@/contexts/MsmeAuthContext';
import { useSchemes } from '@/contexts/SchemesContext';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SchemeDetails from '@/components/scheme/SchemeDetails';
import { Scheme } from '@/contexts/SchemesContext';
import { Button } from '@/components/ui/button';

export default function SchemePage() {
  const { authStep } = useMsmeAuth();
  const { getSchemeById, fetchSchemeBySlug } = useSchemes();
  const router = useRouter();
  const params = useParams();
  const schemeSlug = params.id as string;
  const [scheme, setScheme] = useState<Scheme | null>(getSchemeById(schemeSlug) || null);
  const [loading, setLoading] = useState(!scheme);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated via sessionStorage
    const token = sessionStorage.getItem('msme_auth_token');
    if (!token && authStep !== 'authenticated') {
      router.push('/');
    }
  }, [authStep, router]);

  useEffect(() => {
    if (!scheme && schemeSlug && !fetching && !error) {
      setFetching(true);
      setLoading(true);
      setError(null);
      fetchSchemeBySlug(schemeSlug).then((fetchedScheme) => {
        if (fetchedScheme) {
          setScheme(fetchedScheme);
        } else {
          setError('Failed to load scheme. The service may be rate-limited. Please try again later.');
        }
      }).catch(() => {
        setError('Failed to load scheme. Please try again later.');
      }).finally(() => {
        setLoading(false);
        setFetching(false);
      });
    }
  }, [schemeSlug, fetchSchemeBySlug, scheme, fetching, error]);

  if (authStep !== 'authenticated') {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading scheme details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!scheme) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Scheme not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SchemeDetails scheme={scheme} />
    </DashboardLayout>
  );
}

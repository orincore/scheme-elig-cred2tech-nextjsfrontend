'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAgentAuth } from '@/contexts/AgentAuthContext';
import AgentSchemeDetails from '@/components/scheme/AgentSchemeDetails';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const ELIGIBILITY_URL = process.env.NEXT_PUBLIC_ELIGIBILITY_URL || 'http://localhost:4000';

// ─── In-memory cache (survives same session, cleared on hard refresh) ─────────
const schemeCache = new Map<string, any>();

// Adapt an AI engine scheme doc into the combined shape AgentSchemeDetails expects.
function buildFullScheme(s: any) {
  const applicationProcess_md = (() => {
    if (Array.isArray(s.applicationProcess) && s.applicationProcess.length > 0) {
      const text = s.applicationProcess
        .map((p: any) => p.processText || (p.url ? `Apply online: ${p.url}` : ''))
        .filter(Boolean)
        .join('\n\n');
      if (text) return text;
    }
    if (Array.isArray(s.applicationMode) && s.applicationMode.length > 0) {
      return `Application mode: ${s.applicationMode.join(', ')}`;
    }
    return '';
  })();

  return {
    success: true,
    schemeDetail: {
      en: {
        basicDetails: {
          schemeName: s.schemeName,
          schemeShortTitle: s.schemeShortTitle,
          nodalMinistryName: { label: s.nodalMinistryName || '' },
          level: { label: s.level || '' },
          schemeCategory: (s.schemeCategory || []).map((c: string) => ({ label: c })),
          schemeSubCategory: (s.schemeSubCategory || []).map((c: string) => ({ label: c })),
          schemeFor: s.schemeFor || '',
          schemeType: { label: s.schemeType || '' },
          implementingAgency: s.implementingAgency || '',
          tags: s.tags || [],
          schemeUrl: s.schemeUrl || s.references?.[0]?.url || '',
          eligibility: s.eligibilityText ? [s.eligibilityText] : [],
        },
        schemeContent: {
          briefDescription: s.briefDescription || '',
          detailedDescription_md: s.detailedDescription || '',
          benefits_md: s.benefits || '',
          exclusions_md: s.exclusions || '',
          references: s.references || [],
        },
      },
    },
    documents: { en: { documentsRequired_md: s.documentsRequired || '' } },
    faqs: { en: { faqs: [] } },
    applicationChannel: { en: { applicationProcess_md } },
  };
}

export default function AgentSchemePage() {
  const { isAuthenticated } = useAgentAuth();
  const router = useRouter();
  const params = useParams();
  const schemeSlug = params.id as string;

  const [schemeData, setSchemeData] = useState<any>(schemeCache.get(schemeSlug) || null);
  const [loading, setLoading] = useState(!schemeCache.has(schemeSlug));
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/agent/login');
    }
  }, [isAuthenticated, router]);

  // Fetch full scheme details from the public combined endpoint
  useEffect(() => {
    if (!schemeSlug || schemeData || fetching || error) return;

    // Serve from memory cache on back-navigation
    if (schemeCache.has(schemeSlug)) {
      setSchemeData(schemeCache.get(schemeSlug));
      setLoading(false);
      return;
    }

    const fetchScheme = async () => {
      setFetching(true);
      setLoading(true);
      setError(null);

      try {
        // Scheme detail is served by the AI engine's MongoDB catalogue.
        const response = await fetch(
          `${ELIGIBILITY_URL}/api/schemes/${encodeURIComponent(schemeSlug)}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const scheme = json?.scheme || json?.data || null;

        if (scheme) {
          const data = buildFullScheme(scheme);
          schemeCache.set(schemeSlug, data); // persist in memory for this session
          setSchemeData(data);
        } else {
          setError('Failed to load scheme details.');
        }
      } catch (err) {
        console.error('Error fetching scheme:', err);
        setError('Failed to load scheme details. Please try again later.');
      } finally {
        setLoading(false);
        setFetching(false);
      }
    };

    fetchScheme();
  }, [schemeSlug, schemeData, fetching, error]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
        <p className="text-muted-foreground text-lg">Loading scheme details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => router.push('/agent/dashboard')} variant="outline">
          ← Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!schemeData) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Scheme not found.</p>
      </div>
    );
  }

  return <AgentSchemeDetails data={schemeData} />;
}

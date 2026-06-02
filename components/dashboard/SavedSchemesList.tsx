'use client';

import { Scheme } from '@/contexts/SchemesContext';
import { useSchemes } from '@/contexts/SchemesContext';
import { BookmarkCheck, Trash2, ArrowRight, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

function decodeHtml(raw: string): string {
  if (!raw) return raw;
  let s = raw.replace(/&amp;/g, '&');
  s = s
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return s;
}

export default function SavedSchemesList({ schemes }: { schemes: Scheme[] }) {
  const { removeSavedScheme } = useSchemes();
  const router = useRouter();

  const handleRemove = (e: React.MouseEvent, schemeId: string, schemeName: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeSavedScheme(schemeId);
    toast.success(`"${decodeHtml(schemeName)}" removed from saved`);
  };

  /* ── Empty state ─────────────────────────────────────────────────────────── */
  if (schemes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-none overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Bookmark className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">No saved schemes yet</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-xs">
            Explore schemes and bookmark your favourites to review or apply later
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse Schemes
          </Link>
        </div>
      </div>
    );
  }

  /* ── Schemes table ───────────────────────────────────────────────────────── */
  return (
    <div className="bg-card border border-border rounded-none overflow-hidden">
      {/* Table header */}
      <div className="px-5 py-3.5 border-b border-border bg-background flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <BookmarkCheck className="h-4 w-4 text-primary" />
            Saved Schemes
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {schemes.length} scheme{schemes.length !== 1 ? 's' : ''} saved to your library
          </p>
        </div>
      </div>

      <div className="overflow-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr className="bg-background border-b-2 border-border">
              {['Scheme', 'Ministry', 'Level / Category', 'Tags', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.1em]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schemes.map((scheme) => (
              <tr
                key={scheme.id}
                className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => router.push(`/scheme/${scheme.id}`)}
              >
                {/* Scheme name */}
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-foreground leading-snug max-w-[220px]">
                    {decodeHtml(scheme.schemeName)}
                  </p>
                  {scheme.schemeFor && (
                    <p className="text-xs text-muted-foreground mt-0.5">{decodeHtml(scheme.schemeFor)}</p>
                  )}
                </td>

                {/* Ministry */}
                <td className="px-5 py-4">
                  <p className="text-xs text-foreground max-w-[180px] leading-snug">
                    {decodeHtml(scheme.nodalMinistryName || '—')}
                  </p>
                </td>

                {/* Level / Category */}
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1.5">
                    {scheme.schemeLevel && (
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full w-fit">
                        {scheme.schemeLevel}
                      </span>
                    )}
                    {scheme.schemeCategory?.slice(0, 1).map((cat) => (
                      <span key={cat} className="inline-block text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full w-fit">
                        {decodeHtml(cat)}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Tags */}
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                    {scheme.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {decodeHtml(tag)}
                      </span>
                    ))}
                    {(scheme.tags?.length ?? 0) > 3 && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        +{(scheme.tags?.length ?? 0) - 3}
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/scheme/${scheme.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button
                      onClick={(e) => handleRemove(e, scheme.id, scheme.schemeName)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

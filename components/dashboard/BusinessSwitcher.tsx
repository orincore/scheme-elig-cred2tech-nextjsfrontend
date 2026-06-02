'use client';

import { useEffect, useRef, useState } from 'react';
import { useMsmeAuth, BusinessProfile } from '@/contexts/MsmeAuthContext';
import { useSchemes } from '@/contexts/SchemesContext';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

function bizName(b: BusinessProfile): string {
  return b.legalNameOfBusiness || b.tradeNameOfBusiness || b.panNumber || `Business #${b.id}`;
}

export default function BusinessSwitcher() {
  const { businesses, activeBusinessId, refreshBusinesses, setActiveBusiness, startAddBusiness } = useMsmeAuth();
  const { loadSchemesForDashboard } = useSchemes();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const active = businesses.find((b) => b.id === activeBusinessId) || businesses[0];
  if (!businesses.length) return null;

  const handleSwitch = async (id: number) => {
    if (id === activeBusinessId) { setOpen(false); return; }
    setSwitching(true);
    const ok = await setActiveBusiness(id);
    setSwitching(false);
    setOpen(false);
    if (ok) {
      toast.success('Switched business — refreshing schemes');
      await loadSchemesForDashboard();
    } else {
      toast.error('Could not switch business');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:border-primary/50 transition-colors max-w-[220px]"
      >
        <Building2 className="w-4 h-4 text-primary shrink-0" />
        <span className="truncate">{active ? bizName(active) : 'Select business'}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
            Your businesses
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {businesses.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => handleSwitch(b.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{bizName(b)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.panNumber || 'PAN pending'}
                      {b.constitutionOfBusiness ? ` · ${b.constitutionOfBusiness}` : ''}
                    </p>
                  </div>
                  {b.id === activeBusinessId && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => { setOpen(false); startAddBusiness(); }}
            className="w-full flex items-center gap-2 px-3 py-3 text-sm font-medium text-primary border-t border-border hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add another business
          </button>
        </div>
      )}
    </div>
  );
}

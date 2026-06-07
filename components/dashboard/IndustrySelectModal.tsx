'use client';

import { useState } from 'react';
import { useSchemes } from '@/contexts/SchemesContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Factory, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Dedicated, blocking "confirm your industry" popup. Shown when the PAN API
// couldn't determine the business sector (absent / 'other' / unknown). The AI
// engine needs a clear industry — without it every user gets a generic,
// irrelevant scheme list — so this gate saves the choice to the active business
// and only then lets the analysis run. Intentionally has no dismiss/close: a
// valid industry is mandatory before results can be shown.
export default function IndustrySelectModal() {
  const { needsIndustry, industryOptions, submitIndustry } = useSchemes();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!needsIndustry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) { toast.error('Please select your industry'); return; }
    setSubmitting(true);
    try {
      await submitIndustry(value);
      toast.success('Industry saved — finding schemes that match your business…');
    } catch {
      toast.error('Failed to save your industry. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg bg-card border-border shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Factory className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Confirm your industry</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn’t determine your industry from your PAN details. Pick the one that
                best fits your business — it’s essential for matching the right government
                schemes. Without it, results would be generic and irrelevant.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Business Sector / Industry
              <span className="text-destructive ml-1">*</span>
            </label>
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={submitting}
              className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select your industry</option>
              {industryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="p-6 pt-0 border-border flex gap-3">
            <Button
              type="submit"
              disabled={submitting || !value}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finding Schemes…</>
              ) : (
                <>Save & Find My Schemes <ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

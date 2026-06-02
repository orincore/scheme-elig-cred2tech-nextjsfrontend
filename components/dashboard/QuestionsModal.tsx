'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSchemes, EligibilityQuestion } from '@/contexts/SchemesContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, HelpCircle, CheckCircle2, MessageCircleQuestion } from 'lucide-react';
import { toast } from 'sonner';

function isYesNo(q: EligibilityQuestion): boolean {
  const f = (q.expected_format || '').toLowerCase();
  return f === 'yes_no' || f === 'boolean' || f === 'yesno';
}

function QuestionInput({ q, value, onChange }: { q: EligibilityQuestion; value: string; onChange: (v: string) => void }) {
  const fmt = (q.expected_format || '').toLowerCase();
  if (isYesNo(q)) {
    return (
      <div className="flex gap-2">
        {['yes', 'no'].map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
              value === opt
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-primary/5'
            }`}>{opt}</button>
        ))}
      </div>
    );
  }
  if (q.options && q.options.length > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
              value === opt
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-primary/5'
            }`}>{opt}</button>
        ))}
      </div>
    );
  }
  return (
    <Input type={fmt === 'number' ? 'number' : 'text'} value={value} placeholder="Type your answer"
      onChange={(e) => onChange(e.target.value)} />
  );
}

export default function QuestionsModal() {
  const { questions, isSubmittingAnswers, submitQuestionAnswers } = useSchemes();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const dismissedRef = useRef(false);
  const prevCountRef = useRef(0);

  // Auto-open when new questions arrive (unless the user dismissed this batch).
  useEffect(() => {
    const count = questions.length;
    if (count === 0) {
      dismissedRef.current = false;
      setOpen(false);
    } else if (count > prevCountRef.current && !dismissedRef.current) {
      setOpen(true);
    }
    prevCountRef.current = count;
  }, [questions.length]);

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.field_id] ?? '').toString().trim() !== '').length,
    [questions, answers],
  );

  const handleSubmit = async () => {
    const filled: Record<string, string> = {};
    for (const q of questions) {
      const val = (answers[q.field_id] ?? '').toString().trim();
      if (val !== '') filled[q.field_id] = val;
    }
    if (Object.keys(filled).length === 0) { toast.error('Please answer at least one question'); return; }
    await submitQuestionAnswers(filled);
    setAnswers((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(filled)) delete next[k];
      return next;
    });
    toast.success('Answers submitted — re-checking your eligibility');
  };

  const affected = questions.reduce((n, q) => n + (q.affectedSchemes?.length || 0), 0);

  return (
    <>
      {/* Floating reminder when there are pending questions and the modal is closed */}
      {questions.length > 0 && !open && (
        <button
          onClick={() => { dismissedRef.current = false; setOpen(true); }}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 shadow-lg shadow-amber-500/30 transition-colors animate-in fade-in slide-in-from-bottom-2"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <MessageCircleQuestion className="w-4.5 h-4.5" />
          <span className="text-sm font-medium">Answer {questions.length} question{questions.length > 1 ? 's' : ''}</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) dismissedRef.current = true; setOpen(o); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-amber-50 to-background dark:from-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">Unlock more schemes</DialogTitle>
                <DialogDescription>
                  A few quick answers confirm your eligibility for {affected} more scheme{affected !== 1 ? 's' : ''}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-4 space-y-5 max-h-[55vh] overflow-y-auto">
            {questions.map((q, i) => (
              <div key={q.field_id} className="space-y-2">
                <Label className="text-sm font-medium text-foreground flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{q.question}</span>
                </Label>
                {q.why_needed && <p className="text-xs text-muted-foreground pl-5">{q.why_needed}</p>}
                <div className="pl-5">
                  <QuestionInput q={q} value={answers[q.field_id] ?? ''} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.field_id]: v }))} />
                  {q.affectedSchemes?.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      For: {q.affectedSchemes.slice(0, 2).map((s) => s.schemeName).join(', ')}{q.affectedSchemes.length > 2 ? ` +${q.affectedSchemes.length - 2}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30 sm:justify-between items-center gap-2">
            <span className="text-xs text-muted-foreground">{answeredCount} of {questions.length} answered</span>
            <Button onClick={handleSubmit} disabled={isSubmittingAnswers || answeredCount === 0} className="min-w-36">
              {isSubmittingAnswers
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Re-checking…</>
                : <><CheckCircle2 className="w-4 h-4 mr-2" /> Submit answers</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

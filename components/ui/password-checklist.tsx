'use client';

import { Check, X } from 'lucide-react';
import { getPasswordRequirements, PASSWORD_RULES } from '@/lib/validators';

/**
 * Live password-requirements checklist. Each rule turns emerald with a check
 * once met. Backed by the shared validators so rules stay in one place.
 */
export function PasswordChecklist({ password, className = '' }: { password: string; className?: string }) {
  const reqs = getPasswordRequirements(password);
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {PASSWORD_RULES.map(({ key, label }) => {
        const met = reqs[key];
        return (
          <div
            key={key}
            className={`flex items-center gap-2.5 text-[12px] font-medium transition-colors duration-300 ${
              met ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#4a5d73] dark:text-[#94a3b8]'
            }`}
          >
            {met ? <Check className="h-4 w-4 shrink-0" strokeWidth={3} /> : <X className="h-4 w-4 shrink-0" />}
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default PasswordChecklist;

'use client';

import { Check } from 'lucide-react';

const FEATURES = [
  'One-click access to 100+ government schemes',
  'Personalized, AI-powered eligibility checks',
  'Expert support throughout the process',
];

/**
 * Shared indigo brand panel for the entire MSME onboarding flow (landing → OTP →
 * PAN → payment → summary). It stays identical across every stage so the left
 * side is "intact" while only the right form content changes.
 *
 * Pass to <AuthShell brand={<MsmeAuthBrand />}> on each stage.
 */
export function MsmeAuthBrand({
  title = 'Unlock government schemes for your business',
  subtitle = 'Discover what you qualify for, check eligibility instantly, and apply — all in one secure place.',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <>
      <div className="mt-12 text-white">
        <h2 className="text-3xl font-bold leading-tight mb-4">{title}</h2>
        <p className="text-indigo-100 text-[15px] leading-relaxed opacity-90 mb-8">{subtitle}</p>
        <ul className="space-y-3.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3 text-[14px] text-indigo-50">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-auto flex-1 flex items-center justify-center">
        <div className="absolute h-56 w-56 rounded-full bg-indigo-400/30 blur-3xl animate-pulse" />
        <div className="absolute h-40 w-40 rounded-full bg-white/10 blur-2xl animate-pulse [animation-delay:1s]" />
        <div className="relative w-64 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 shadow-2xl rotate-[-6deg]">
          <div className="flex items-center justify-between mb-5">
            <div className="h-9 w-9 rounded-xl bg-white/80" />
            <div className="h-2.5 w-14 rounded-full bg-white/40" />
          </div>
          <div className="h-2.5 w-36 rounded-full bg-white/50 mb-2.5" />
          <div className="h-2.5 w-28 rounded-full bg-white/30 mb-5" />
          <div className="flex items-center gap-2">
            <div className="h-7 flex-1 rounded-lg bg-white/15" />
            <div className="h-7 w-16 rounded-lg bg-white/70" />
          </div>
        </div>
      </div>
    </>
  );
}

export default MsmeAuthBrand;

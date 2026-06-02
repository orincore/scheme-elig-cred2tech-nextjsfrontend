'use client';

import { Check } from 'lucide-react';

export interface AuthStep {
  num: number;
  title: string;
}

/**
 * Cred2Tech vertical step indicator for the brand panel — filled circles,
 * check marks on completed steps, and an animated connecting line that fills
 * as the user advances. Reusable for any multi-step onboarding flow.
 */
export function AuthStepper({ steps, current }: { steps: AuthStep[]; current: number }) {
  return (
    <div className="flex flex-col mt-12 w-full">
      {steps.map((s, idx) => {
        const isActive = current === s.num;
        const isCompleted = current > s.num;
        const isLast = idx === steps.length - 1;
        return (
          <div key={s.num} className="flex gap-5 group">
            <div className="flex flex-col items-center w-10 shrink-0">
              <div
                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-500 ease-out z-10 ${
                  isActive
                    ? 'bg-white border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)] text-indigo-600'
                    : isCompleted
                      ? 'bg-white/90 border-white/90 text-indigo-600'
                      : 'bg-[#4f46e5] dark:bg-[#312e81] border-white/30 text-white/40'
                }`}
              >
                {isCompleted ? <Check className="h-5 w-5" strokeWidth={3} /> : <span className="text-[15px] font-bold">{s.num}</span>}
              </div>
              {!isLast && (
                <div className="w-[2px] flex-1 my-2 bg-white/10 dark:bg-white/5 rounded-full relative">
                  <div
                    className="absolute top-0 left-0 w-full bg-white rounded-full transition-all duration-700 ease-in-out"
                    style={{ height: current > s.num ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
            <div
              className={`flex flex-col justify-start ${isLast ? '' : 'pb-10'} transition-transform duration-500 ease-out`}
              style={{ transform: isActive ? 'translateX(4px)' : 'translateX(0)' }}
            >
              <div
                className={`text-[10px] font-bold tracking-[0.15em] uppercase mb-0.5 mt-0.5 transition-colors duration-300 ${
                  isActive ? 'text-indigo-200' : isCompleted ? 'text-white/60' : 'text-white/30'
                }`}
              >
                Step {s.num}
              </div>
              <div
                className={`text-[16px] leading-tight transition-all duration-300 ${
                  isActive ? 'text-white font-bold' : isCompleted ? 'text-white/90 font-semibold' : 'text-white/40 font-medium'
                }`}
              >
                {s.title}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AuthStepper;

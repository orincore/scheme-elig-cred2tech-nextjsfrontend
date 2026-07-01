import type { ReactNode } from 'react';

export const metadata = { title: 'Demo — Cred2Tech MSME Platform' };

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      {/* Floating demo badge — always visible, non-intrusive */}
      <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 shadow-lg dark:border-indigo-800 dark:bg-indigo-950/80">
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
          Demo Mode
        </span>
      </div>
    </>
  );
}

'use client';

import * as React from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/brand-logo';
import PageTransition from '@/components/ui/page-transition';

export interface AuthShellProps {
  /** Content of the indigo brand panel, rendered under the white logo. */
  brand: React.ReactNode;
  /** The form content for the right panel. */
  children: React.ReactNode;
  /** Override the right-panel content container classes (width, padding, alignment). */
  contentClassName?: string;
  /** Extra control rendered next to the theme toggle (e.g. an onboarding logout button). */
  headerSlot?: React.ReactNode;
}

const DEFAULT_CONTENT =
  'flex-1 flex flex-col px-6 py-8 md:px-16 lg:px-24 justify-center max-w-xl mx-auto w-full';

/**
 * Cred2Tech split auth layout: a fixed indigo brand panel on the left (logo +
 * supplied content) and a scrollable form panel on the right with the theme
 * toggle and a mobile logo header. Reuse for any login / register / onboarding
 * screen — pass the brand panel content and the form as children.
 */
export function AuthShell({ brand, children, contentClassName = DEFAULT_CONTENT, headerSlot }: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-[#0a1628] font-sans overflow-hidden">
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col w-2/5 max-w-[480px] bg-indigo-600 dark:bg-indigo-900 relative overflow-hidden shrink-0">
        <div className="p-10 flex flex-col flex-1 z-10">
          <div className="mb-8">
            <BrandLogo size="xlarge" forceVariant="white" className="brightness-0 invert" />
          </div>
          {brand}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-800/50 dark:from-black/40 via-transparent to-transparent pointer-events-none z-20" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col relative h-screen overflow-y-auto">
        <div className="flex md:hidden items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <BrandLogo size="large" />
          <div className="flex items-center gap-4">
            {headerSlot}
            <ThemeToggle />
          </div>
        </div>
        <div className="hidden md:flex absolute top-6 right-6 z-50 items-center gap-4">
          {headerSlot}
          <ThemeToggle />
        </div>
        <div className={contentClassName}><PageTransition>{children}</PageTransition></div>
      </div>
    </div>
  );
}

export default AuthShell;

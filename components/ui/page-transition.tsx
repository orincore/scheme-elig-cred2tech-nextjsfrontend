'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Smooth page-enter transition for content areas. Keyed on the pathname so the
 * wrapped content re-mounts and replays a subtle fade + rise on every route
 * change — removing the abrupt "cut" between pages. Pure CSS (tw-animate-css),
 * GPU-friendly (opacity + small translate), and respects prefers-reduced-motion.
 *
 * Wrap ONLY the page-content slot of a layout (not the sidebar/header) so the
 * chrome stays put and only the page itself animates.
 */
export default function PageTransition({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none ${className}`}
    >
      {children}
    </div>
  );
}

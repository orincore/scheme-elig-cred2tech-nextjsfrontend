'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

/**
 * Light/dark toggle with the Cred2Tech diagonal "blade wipe" view transition.
 * Falls back to an instant switch where the View Transitions API is unavailable.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="size-9 rounded-lg border border-border bg-card" aria-hidden />
    );
  }

  const isDark = resolvedTheme === 'dark';
  const next = isDark ? 'light' : 'dark';

  const handleToggle = () => {
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      }
    ).startViewTransition;

    if (typeof startViewTransition !== 'function') {
      setTheme(next);
      return;
    }

    const wipeClass = next === 'dark' ? 'wipe-to-dark' : 'wipe-to-light';
    document.documentElement.classList.add(wipeClass);
    const transition = startViewTransition.call(document, () => setTheme(next));
    transition.finished.finally(() => {
      document.documentElement.classList.remove(wipeClass);
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${className}`}
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

export default ThemeToggle;

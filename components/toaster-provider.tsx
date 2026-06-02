'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

export default function ToasterProvider() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      visibleToasts={4}
      gap={8}
      offset={20}
      closeButton
      toastOptions={{ duration: 3500 }}
    />
  );
}

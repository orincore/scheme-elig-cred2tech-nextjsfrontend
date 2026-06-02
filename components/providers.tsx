'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AgentAuthProvider } from '@/contexts/AgentAuthContext';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AgentAuthProvider>
        <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
      </AgentAuthProvider>
    </ThemeProvider>
  );
}

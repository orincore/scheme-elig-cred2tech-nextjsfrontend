import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { MsmeAuthProvider } from '@/contexts/MsmeAuthContext'
import { SchemesProvider } from '@/contexts/SchemesContext'
import { Providers } from '@/components/providers'
import ToasterProvider from '@/components/toaster-provider'

// Cred2Tech brand font — loaded via next/font for reliable hashing + preloading.
const hikasami = localFont({
  src: [
    { path: '../public/fonts/Hikasami-Regular.otf', weight: '400', style: 'normal' },
    { path: '../public/fonts/Hikasami-Medium.otf', weight: '500', style: 'normal' },
    { path: '../public/fonts/Hikasami-SemiBold.otf', weight: '600', style: 'normal' },
    { path: '../public/fonts/Hikasami-Bold.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-hikasami',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MSME Scheme Discovery Platform',
  description: 'Discover and apply for government schemes for small and medium enterprises',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${hikasami.variable} bg-background`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <MsmeAuthProvider>
            <SchemesProvider>
              {children}
            </SchemesProvider>
          </MsmeAuthProvider>
        </Providers>
        <ToasterProvider />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

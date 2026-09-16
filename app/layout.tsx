import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'RenovAI - Asystent Remontu & Projektowania Wnętrz',
  description: 'Lokalny, privacy-first asystent projektowania i remontu mieszkania z analizą foto, kosztorysem, harmonogramem prac i trybem offline PWA.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RenovAI',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'RenovAI - Asystent Remontu & Projektowania Wnętrz',
    description: 'Lokalny, privacy-first asystent projektowania i remontu mieszkania z analizą foto, kosztorysem, harmonogramem prac i trybem offline PWA.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RenovAI - Asystent Remontu & Projektowania Wnętrz',
    description: 'Lokalny, privacy-first asystent projektowania i remontu mieszkania z analizą foto, kosztorysem, harmonogramem prac i trybem offline PWA.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-teal-500/25 selection:text-teal-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

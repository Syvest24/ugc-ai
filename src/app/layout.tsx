import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'UGCForge – AI-Powered UGC Content Generator',
    template: '%s | UGCForge',
  },
  description: 'Generate high-converting UGC scripts, hooks, captions and more for TikTok, Instagram, YouTube Shorts and LinkedIn.',
  keywords: ['UGC', 'content generator', 'AI copywriting', 'TikTok scripts', 'Instagram captions', 'social media marketing'],
  authors: [{ name: 'UGCForge' }],
  openGraph: {
    type: 'website',
    siteName: 'UGCForge',
    title: 'UGCForge – AI-Powered UGC Content Generator',
    description: 'Generate high-converting UGC scripts, hooks, captions and more for TikTok, Instagram, YouTube Shorts and LinkedIn.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UGCForge – AI-Powered UGC Content Generator',
    description: 'Generate high-converting UGC scripts, hooks, captions and more.',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-950 text-gray-100">
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            Skip to main content
          </a>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                border: '1px solid #374151',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}

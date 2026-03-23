import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'UGCForge – AI-Powered UGC Content Generator',
    template: '%s | UGCForge',
  },
  description: 'Generate high-converting UGC scripts, hooks, captions, AI videos, and ad copy for TikTok, Instagram, YouTube Shorts, and LinkedIn. Free AI-powered content generator for creators and ecommerce brands.',
  keywords: [
    'UGC generator', 'AI UGC creator', 'TikTok script generator', 'Instagram caption generator',
    'viral video scripts', 'UGC content generator', 'AI copywriting', 'social media marketing',
    'short-form video generator', 'product video scripts', 'AI ad copy', 'YouTube Shorts generator',
  ],
  authors: [{ name: 'UGCForge' }],
  creator: 'UGCForge',
  openGraph: {
    type: 'website',
    siteName: 'UGCForge',
    title: 'UGCForge – AI-Powered UGC Content Generator',
    description: 'Generate high-converting UGC scripts, hooks, captions, videos and more for TikTok, Instagram, YouTube Shorts, and LinkedIn.',
    url: siteUrl,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UGCForge – AI-Powered UGC Content Generator',
    description: 'Generate high-converting UGC scripts, hooks, captions and more.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
  alternates: {
    canonical: siteUrl,
  },
}

// JSON-LD structured data for Organization + SoftwareApplication
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'UGCForge',
      url: siteUrl,
      description: 'AI-powered UGC content generator for creators and ecommerce brands.',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'UGCForge',
      url: siteUrl,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Generate high-converting UGC scripts, hooks, captions, AI videos, and ad copy for social media platforms.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-950 text-gray-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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

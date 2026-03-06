import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.pexels.com https://*.pexels.com https://image.pollinations.ai https://replicate.delivery https://*.replicate.delivery https://picsum.photos https://fastly.picsum.photos",
      "media-src 'self' blob: data:",
      "font-src 'self' data:",
      "connect-src 'self' https://openrouter.ai https://api.groq.com https://api.together.xyz https://api-inference.huggingface.co https://api.mistral.ai https://api.pexels.com https://api.replicate.com https://replicate.delivery https://*.replicate.delivery https://api.d-id.com https://api.stability.ai https://generativelanguage.googleapis.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: [
    'msedge-tts',
    '@remotion/bundler',
    '@remotion/renderer',
    'remotion',
    'ffmpeg-static',
    'pg',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'image.pollinations.ai' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;

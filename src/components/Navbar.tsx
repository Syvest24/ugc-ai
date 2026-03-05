'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Zap, LayoutDashboard, PenSquare, BookMarked, Settings, LogOut, Video, Calendar, BarChart3, Menu, X, ImageIcon, Palette, Wand2, Compass, Megaphone, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generate', label: 'Generate UGC', icon: PenSquare },
  { href: '/video', label: 'Create Video', icon: Video },
  { href: '/text-to-video', label: 'Text to Video', icon: Film },
  { href: '/video-to-video', label: 'Video to Video', icon: Palette },
  { href: '/images', label: 'AI Images', icon: ImageIcon },
  { href: '/image-editor', label: 'Image Editor', icon: Wand2 },
  { href: '/ai-ads', label: 'AI Ads', icon: Megaphone },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/saved', label: 'Saved', icon: BookMarked },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">UGCForge</span>
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-800 text-gray-400"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-violet-600/20 text-violet-400 border border-violet-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-gray-950 border-b border-gray-800 flex items-center px-4 z-40 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white">UGCForge</span>
        </Link>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: fixed, mobile: slide-in drawer */}
      <nav
        className={cn(
          'fixed top-0 h-full w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-50 transition-transform duration-300 ease-in-out',
          // Desktop: always visible
          'lg:translate-x-0',
          // Mobile: slide in/out
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {sidebarContent}
      </nav>
    </>
  )
}

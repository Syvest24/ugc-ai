import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Navbar from '@/components/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Navbar />
      <main id="main-content" className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}

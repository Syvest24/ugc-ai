import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(8).max(128),
        }).safeParse(credentials)

        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Rate limit: 10 login attempts per email per 15 minutes
        if (!rateLimit(`login:${email}`, 10, 15 * 60 * 1000)) {
          return null
        }

        // Look up user in database
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true },
        })

        if (!user || !user.passwordHash) {
          // User doesn't exist or has no password set — reject
          return null
        }

        // Verify password with bcrypt
        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours (down from default 30 days)
  },
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth, upsert the user into our DB
      if (account?.provider === 'google' && user.email) {
        try {
          await prisma.user.upsert({
            where: { email: user.email },
            update: { name: user.name ?? undefined },
            create: { email: user.email, name: user.name ?? null },
          })
        } catch (err) {
          console.error('[auth] Failed to upsert Google user:', err)
          return false
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        if (user.id) {
          // Credentials login — id is set directly by authorize()
          token.id = user.id
        } else if (user.email) {
          // OAuth login — look up the DB user id by email
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true },
          })
          if (dbUser) token.id = dbUser.id
        }
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})

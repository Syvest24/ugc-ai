/**
 * Vitest global setup
 *
 * Sets environment variables and mocks required by Next.js API routes.
 */

// Provide a dummy AUTH_SECRET so NextAuth doesn't throw during import
process.env.AUTH_SECRET ??= 'vitest-test-secret-DO-NOT-USE-IN-PRODUCTION-0123456789abcdef'
// @ts-expect-error — override for test environment
process.env.NODE_ENV = 'test'

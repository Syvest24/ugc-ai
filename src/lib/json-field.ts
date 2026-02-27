/**
 * Safe JSON field parser — compatible with both SQLite (string) and PostgreSQL (native Json).
 * 
 * SQLite stores JSON as strings → needs JSON.parse()
 * PostgreSQL native Json type returns objects directly → no parsing needed
 * 
 * Use this instead of raw JSON.parse() on database JSON fields to ensure
 * compatibility when migrating between database providers.
 */
export function parseJsonField<T>(value: string | T | null | undefined, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value as T
}

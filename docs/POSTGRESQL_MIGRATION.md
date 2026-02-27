# PostgreSQL Migration Guide

## Overview

UGCForge ships with SQLite for zero-config local development. For production deployments, switch to PostgreSQL for better concurrency, native JSON support, and scalability.

## Prerequisites

- PostgreSQL 15+ installed (local, Docker, or managed like Supabase/Neon/RDS)
- A database created: `CREATE DATABASE ugcforge;`

## Step-by-Step Migration

### 1. Set `DATABASE_URL`

Add to `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ugcforge?schema=public"
```

### 2. Swap the Schema

```bash
# Back up current SQLite schema
cp prisma/schema.prisma prisma/schema.sqlite.prisma

# Use PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

### 3. Install PostgreSQL Driver

The project uses Prisma's driver adapter pattern. For PostgreSQL:

```bash
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

Then update `prisma.config.ts`:

```typescript
import { defineConfig } from '@prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/ugcforge',
  },
})
```

### 4. Update `src/lib/db.ts`

Change the adapter import from `better-sqlite3` to `pg`:

```typescript
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
```

### 5. Run Migrations

```bash
# Generate new migration for PostgreSQL
npx prisma migrate dev --name init-postgres

# Generate Prisma client
npx prisma generate
```

### 6. Data Migration (Optional)

If you have existing SQLite data to preserve:

```bash
# Export from SQLite
sqlite3 prisma/dev.db ".dump" > backup.sql

# Use pgloader or a custom script to transform and load
# Key transformations needed:
# - Boolean: SQLite 0/1 → PostgreSQL true/false  
# - DateTime: SQLite string → PostgreSQL timestamp
# - JSON fields: Already strings, PostgreSQL will accept them
```

For small datasets, the simplest approach is to re-register users and regenerate content.

## Schema Differences

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| JSON fields | `String` (manually parsed) | Native `Json` type |
| Long text | `String` | `String @db.Text` |
| Concurrency | Single-writer | Multi-writer |
| Full-text search | Limited | `tsvector` + GIN indexes |
| JSON queries | Not supported | `jsonb` operators |

## JSON Field Compatibility

The PostgreSQL schema uses native `Json` type instead of `String` for JSON fields. The codebase includes `src/lib/json-field.ts` with a `parseJsonField()` utility that handles both:

- **SQLite**: Field is a string → `JSON.parse()` is called
- **PostgreSQL**: Field is already an object → returned as-is

Replace raw `JSON.parse()` calls on database fields with `parseJsonField()`:

```typescript
import { parseJsonField } from '@/lib/json-field'

// Before (SQLite only):
const hooks = JSON.parse(content.hookBank || '[]')

// After (works with both):
const hooks = parseJsonField<string[]>(content.hookBank, [])
```

## Docker Compose (Recommended)

For local PostgreSQL:

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ugcforge
      POSTGRES_USER: ugcforge
      POSTGRES_PASSWORD: localdev123
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Then set:
```env
DATABASE_URL="postgresql://ugcforge:localdev123@localhost:5432/ugcforge?schema=public"
```

## Rollback

To revert to SQLite:
```bash
cp prisma/schema.sqlite.prisma prisma/schema.prisma
# Remove DATABASE_URL from .env (or set to file:./dev.db)
npx prisma generate
```

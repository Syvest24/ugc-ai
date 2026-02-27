import { defineConfig } from '@prisma/config'
import path from 'path'
import { config } from 'dotenv'

// Load .env.local for local dev (Vercel injects env vars in production)
config({ path: path.resolve(process.cwd(), '.env.local') })
config({ path: path.resolve(process.cwd(), '.env') })

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})

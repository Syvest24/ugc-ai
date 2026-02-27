# Deploying UGCForge to Vercel

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A PostgreSQL database (recommended: [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres))
3. Your repository pushed to GitHub/GitLab/Bitbucket

## Step 1: Set Up PostgreSQL Database

### Option A: Neon (recommended — generous free tier)
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string: `postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require`

### Option B: Vercel Postgres
1. In Vercel Dashboard → Storage → Create → Postgres
2. Vercel auto-injects `DATABASE_URL` into your project

### Option C: Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection String (URI)

## Step 2: Push Database Schema

```bash
# Set your PostgreSQL URL
export DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"

# Push the schema to your database
npx prisma db push
```

## Step 3: Deploy to Vercel

### Via Vercel CLI
```bash
npm i -g vercel
vercel
```

### Via Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel auto-detects Next.js — no framework config needed

## Step 4: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth JWT secret (`openssl rand -base64 32`) |

### AI Provider (at least one)
| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | `openrouter`, `groq`, `together`, `huggingface`, or `mistral` |
| `LLM_API_KEY` | API key for your chosen LLM provider |

### Image Generation (optional)
| Variable | Description |
|----------|-------------|
| `IMAGE_PROVIDER` | `pollinations` (free, default), `together`, or `stability` |
| `TOGETHER_API_KEY` | Only for Together.ai image gen |
| `STABILITY_API_KEY` | Only for Stability AI image gen |

### Optional
| Variable | Description |
|----------|-------------|
| `PEXELS_API_KEY` | Stock video backgrounds |
| `REPLICATE_API_KEY` | Image-to-video generation |
| `REDIS_URL` | Distributed rate limiting (e.g., Upstash Redis) |

## Architecture Notes

### File Storage on Vercel
- **Images**: Pollinations provider returns external URLs directly. Together/Stability return data URIs. No local file storage needed.
- **Video/Audio**: Uses `/tmp` for intermediate processing. Generated files are ephemeral per invocation.

### Function Timeouts
The `vercel.json` configures extended timeouts for heavy routes:
- Video rendering: 300s (5 min) — requires Vercel Pro plan
- Image generation/batch: 60-120s
- LLM generation: 60s

> **Note**: The Vercel Hobby plan has a 60s function limit. Video rendering routes may need a Pro plan or an alternative approach (e.g., offloading to a background worker via Vercel Cron + Inngest).

### Video Rendering Limitations
Remotion server-side rendering and ffmpeg are heavy operations. On Vercel serverless:
- They work within the function timeout limits
- Large/complex videos may need extended timeouts (Pro plan)
- For production scale, consider offloading to a dedicated rendering service

## Step 5: Verify Deployment

After deployment:
1. Visit your Vercel URL
2. Register a new account at `/login`
3. Test content generation at `/generate`
4. Check the health endpoint: `https://your-app.vercel.app/api/health`

## Troubleshooting

### "PrismaClientInitializationError"
- Ensure `DATABASE_URL` is set correctly in Vercel environment variables
- Run `npx prisma db push` against your production database

### "Module not found: redis"
- This is a harmless warning. Redis is dynamically imported only when `REDIS_URL` is set.

### Images not loading
- If using Pollinations, images are served from `image.pollinations.ai` — CSP headers are pre-configured.
- If using Together/Stability, images are returned as data URIs and work without external hosting.

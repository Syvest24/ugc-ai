# Deploying UGCForge to Railway (Recommended Free Option)

Railway runs your app as a persistent Node.js server — no function timeouts, native ffmpeg/Remotion support, and $5/month free credit (more than enough for this app).

## Step 1: Create a Railway Account

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. You get **$5/month free credit** (no credit card required)

## Step 2: Deploy from GitHub

1. Push your code to a GitHub repository
2. In Railway Dashboard → **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects Next.js and configures the build

## Step 3: Set Environment Variables

In your Railway project → **Variables** tab, add:

### Required
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `AUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `PORT` | `3000` |

### AI Provider
| Variable | Value |
|----------|-------|
| `LLM_PROVIDER` | `openrouter` |
| `LLM_MODEL` | `nvidia/nemotron-nano-9b-v2:free` |
| `LLM_API_KEY` | Your OpenRouter API key |

### Optional
| Variable | Value |
|----------|-------|
| `PEXELS_API_KEY` | For stock video backgrounds |
| `IMAGE_PROVIDER` | `pollinations` (free, default) |
| `REPLICATE_API_KEY` | For image-to-video generation |

## Step 4: Push Database Schema

If you haven't already:
```bash
DATABASE_URL="your-neon-url" npx prisma db push
```

## Step 5: Generate a Public URL

Railway auto-assigns a URL like `your-app.up.railway.app`.
To set a custom domain: **Settings** → **Networking** → **Generate Domain** or add a custom one.

## Step 6: Verify

1. Visit `https://your-app.up.railway.app`
2. Register an account
3. Test content generation

---

## Why Railway over Vercel?

| Feature | Vercel (Hobby) | Railway (Free) |
|---------|---------------|----------------|
| Function timeout | 60s max | **No limit** |
| Video rendering | Needs Pro plan ($20/mo) | **Works natively** |
| ffmpeg | Not available | **Auto-installed** |
| Filesystem | Ephemeral per request | **Persists during runtime** |
| TTS audio | Complex workarounds | **Works out of the box** |
| Cost | Free (limited) / $20 Pro | **$5/mo free credit** |

## Troubleshooting

### App crashes on startup
- Ensure `DATABASE_URL` is set correctly in Railway variables
- Check logs: Railway Dashboard → your service → **Logs**

### "Cannot find ffmpeg"
- The `nixpacks.toml` config auto-installs ffmpeg. If it's missing, add `NIXPACKS_APT_PKGS=ffmpeg` as an environment variable.

### Database connection errors
- Verify your Neon database is active (free tier pauses after 5 min of inactivity)
- Check the connection string includes `?sslmode=require`

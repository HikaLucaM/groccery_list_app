# Deployment Guide

This document explains how to deploy the Shopping List app to Cloudflare Workers.

## 🚀 Deployment Methods

### Method 1: Direct Deployment with Wrangler CLI

```bash
# Deploy to production
wrangler deploy

# Deploy with dry-run (test only)
wrangler deploy --dry-run
```

**Requirements:**
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)
- OpenRouter API key configured (`wrangler secret put OPENROUTER_API_KEY`)

### Method 2: Automatic Deployment via GitHub Actions

The app automatically deploys when you push to the `main` branch.

**Setup GitHub Secrets:**
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

**Workflow:**
1. Make changes locally
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. GitHub Actions will automatically:
   - Run tests
   - Copy `index.html` to `public/` directory
   - Deploy to Cloudflare Workers with Assets

## 📁 Project Structure

```
groccery_list_app/
├── src/
│   └── worker.js          # Cloudflare Worker (API + Assets serving)
├── public/
│   └── index.html         # Frontend (served via Workers Assets)
├── index.html             # Source HTML (copied to public/ during deploy)
├── wrangler.toml          # Cloudflare Workers configuration
└── .github/
    └── workflows/
        └── deploy.yml     # GitHub Actions deployment workflow
```

## 🔧 Configuration

### wrangler.toml

```toml
name = "shared-shopping-list"
main = "src/worker.js"
compatibility_date = "2024-10-07"

[assets]
directory = "./public"
binding = "ASSETS"

[[kv_namespaces]]
binding = "SHOPLIST"
id = "389bc7f46e5b46448fc7ce82640da481"
preview_id = "94251a22e793451bb9a088befea72aae"
```

### Environment Variables (Secrets)

- `OPENROUTER_API_KEY`: Required for AI shopping list generation
- `MODEL` (optional): Override default AI model (default: `meta-llama/llama-3-8b-instruct:free`)
- `MODEL_FALLBACKS` (optional): Comma-separated fallback models

## ✅ Deployment Checklist

Before deploying, ensure:

- [x] `public/index.html` exists and is up-to-date
- [x] OpenRouter API key is configured
- [x] Tests pass (`npm test`)
- [x] `.gitignore` does NOT exclude `public/` directory
- [x] GitHub secrets are configured (for GitHub Actions)

## 🌐 Live URL

After deployment, the app is available at:
**https://shared-shopping-list.grocery-shopping-list.workers.dev**

## 🧪 Testing Deployment

```bash
# Test homepage
curl https://shared-shopping-list.grocery-shopping-list.workers.dev/

# Test AI generation API
curl -X POST https://shared-shopping-list.grocery-shopping-list.workers.dev/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "週末の買い物リスト", "token": "test1234567890abc"}'

# Test list API
curl https://shared-shopping-list.grocery-shopping-list.workers.dev/api/list/test1234567890abc
```

## 🐛 Troubleshooting

### Issue: "Asset too large" error

**Solution:** Ensure `.wranglerignore` excludes `node_modules/`:
```
node_modules/
.git/
test/
```

### Issue: "Invalid path" when accessing root URL

**Solution:** Ensure:
1. `wrangler.toml` has `[assets]` configuration
2. `public/index.html` exists
3. Worker code includes asset serving logic

### Issue: AI generation fails

**Possible causes:**
1. OpenRouter API key not configured
2. Free tier rate limit exceeded
3. API key invalid

**Debug:**
```bash
# Check if secret is configured
wrangler secret list

# View deployment logs
wrangler tail
```

## 📝 Notes

- Both deployment methods (CLI and GitHub Actions) are fully supported
- GitHub Actions automatically copies `index.html` to `public/` before deploy
- The `public/` directory is committed to the repository for consistency
- All AI functionality uses free-tier OpenRouter models with automatic fallback

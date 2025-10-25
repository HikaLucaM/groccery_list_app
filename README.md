🌐 Languages: [English](README.md) | [日本語](README.ja.md)

# Shared Shopping List

A lightweight Cloudflare Workers + KV app for sharing grocery lists with one URL.

## 🌟 Demo

- Live: https://main.shopping-list-app-8to.pages.dev
- Screenshots:
  <img width="200" height="450" alt="Shared Shopping List" src="https://github.com/user-attachments/assets/8425f181-ce51-444b-9ff4-3b9fd5d83b4f" />
  <img width="200" height="450" alt="Shared Shopping List-1" src="https://github.com/user-attachments/assets/59eab371-ef72-4f7a-bfd2-63f6bab7d8db" />

## ✨ Features

- Share a tokenized URL instead of managing accounts
- Real-time polling (7 s) with conflict-safe merges
- Tag filters with presets plus custom entries
- Mobile-first layout with swipe-friendly gestures
- Runs comfortably on the Cloudflare free tier

## 🚀 Quick Start

```bash
git clone https://github.com/HikaLucaM/groccery_list_app.git
cd groccery_list_app
npm install

# Authenticate once
npx wrangler login

# Create KV namespaces and add the ids to wrangler.toml
npx wrangler kv:namespace create SHOPLIST
npx wrangler kv:namespace create SHOPLIST --preview

# Deploy the Worker
npm run deploy

# Publish static assets to Cloudflare Pages
mkdir -p public && cp index.html public/
npx wrangler pages deploy public --project-name=shopping-list-app
```

## �️ How It Works

- Frontend: static `index.html` with vanilla JavaScript
- Backend: Cloudflare Worker that stores lists in KV and merges concurrent edits by version
- Storage: Cloudflare KV namespace keyed by `list:${token}`
- Sync: clients poll every 7 seconds and send base versions with pending deletions

## 📄 License

- [MIT](LICENSE)

## 🤝 Contributions

- Pull requests welcome.

## 📮 Contact

- Open an [issue](https://github.com/HikaLucaM/groccery_list_app/issues).

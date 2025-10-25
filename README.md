🌐 Languages: [English](README.md) | [日本語](README.ja.md)

# Shared Shopping List

A lightweight Cloudflare Workers + KV app for sharing grocery lists with one URL.

## 🌟 Demo

- Live: https://shared-shopping-list.grocery-shopping-list.workers.dev
- Screenshots:

  
  <img width="200" height="450" alt="Shared Shopping List" src="https://github.com/user-attachments/assets/8425f181-ce51-444b-9ff4-3b9fd5d83b4f" />

  <img width="200" height="450" alt="image" src="https://github.com/user-attachments/assets/e02e1ec3-4b88-47c2-8770-ec6b3f61e22d" />
  <img width="200" height="450" alt="image" src="https://github.com/user-attachments/assets/01a4f30b-d298-4b2f-b5fc-1ced52ac93dc" />
  <img width="200" height="450" alt="image" src="https://github.com/user-attachments/assets/3a91527b-dc06-447f-bf95-678c5afb18aa" />





## ✨ Features

- **AI-Powered Shopping List Generation** - Generate shopping lists with AI assistance
- **Smart Sharing** - Share a tokenized URL instead of managing accounts
- **Real-time Sync** - Polling (7 s) with conflict-safe merges
- **Flexible Tagging** - Tag filters with presets plus custom entries
- **Mobile-Optimized** - Mobile-first layout with swipe-friendly gestures
- **Free Tier Friendly** - Runs comfortably on the Cloudflare free tier

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

## 🛠️ How It Works

- **Frontend**: static `index.html` with vanilla JavaScript
- **Backend**: Cloudflare Worker that stores lists in KV and merges concurrent edits by version
- **Storage**: Cloudflare KV namespace keyed by `list:${token}`
- **Sync**: clients poll every 7 seconds and send base versions with pending deletions
- **AI Integration**: Cloudflare Workers AI (Llama model) for generating shopping lists from natural language prompts

## 📄 License

- [MIT](LICENSE)

## 🤝 Contributions

- Pull requests welcome.

## 📮 Contact

- Open an [issue](https://github.com/HikaLucaM/groccery_list_app/issues)

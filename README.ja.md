🌐 Languages: [English](README.md) | [日本語](README.ja.md)

# Shared Shopping List

Cloudflare Workers と KV で動く、URL共有型の買い物リストアプリです。

## 🌟 デモ

- 公開URL: https://shared-shopping-list.grocery-shopping-list.workers.dev
- スクリーンショット:
  <img width="200" height="450" alt="Shared Shopping List" src="https://github.com/user-attachments/assets/8425f181-ce51-444b-9ff4-3b9fd5d83b4f" />
  <img width="200" height="450" alt="Shared Shopping List-1" src="https://github.com/user-attachments/assets/59eab371-ef72-4f7a-bfd2-63f6bab7d8db" />

## ✨ 特徴

- **AI買い物リスト生成** - AI機能で買い物リストを自動生成
- **簡単共有** - 秘密のトークン付きURLを共有するだけで共同編集
- **リアルタイム同期** - 7秒ごとのポーリングとバージョン管理で競合を自動解決
- **柔軟なタグ管理** - プリセット＋カスタムタグでアイテムを整理
- **モバイル最適化** - モバイル最適化されたUIとスワイプ操作
- **無料運用可能** - Cloudflare無料枠内で運用可能

## 🚀 クイックスタート

```bash
git clone https://github.com/HikaLucaM/groccery_list_app.git
cd groccery_list_app
npm install

# Cloudflare にログイン
npx wrangler login

# KV 名前空間を作成し、wrangler.toml に ID を設定
npx wrangler kv:namespace create SHOPLIST
npx wrangler kv:namespace create SHOPLIST --preview

# Worker をデプロイ
npm run deploy

# 静的ファイルを Cloudflare Pages へ公開
mkdir -p public && cp index.html public/
npx wrangler pages deploy public --project-name=shopping-list-app
```

## 🛠️ 仕組み

- **フロントエンド**: `index.html`（Vanilla JS）
- **バックエンド**: Cloudflare Worker が KV に保存し、バージョン付きでマージ
- **ストレージ**: Cloudflare KV（キー形式: `list:${token}`）
- **同期**: クライアントが7秒ごとにポーリングし、baseVersion と deletedItemIds を送信
- **AI統合**: Cloudflare Workers AI（Llamaモデル）による自然言語からの買い物リスト生成

## � セキュリティ

**重要**: このプロジェクトはAPIキーとシークレット情報を使用します。コントリビュートやデプロイの前に必ず [SECURITY.md](SECURITY.md) をお読みください。

重要なポイント:
- APIキーは絶対にGitにコミットしない
- ローカル開発では `.dev.vars` を使用（既に `.gitignore` に含まれています）
- 本番環境では `wrangler secret put` を使用
- 詳細は [SECURITY.md](SECURITY.md) を参照

## �📄 ライセンス

- [MIT](LICENSE)

## 🤝 コントリビューション

- プルリクエストを歓迎します。

## 📮 連絡先

- [Issues](https://github.com/HikaLucaM/groccery_list_app/issues) からどうぞ。

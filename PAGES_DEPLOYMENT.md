# Cloudflare Pages デプロイ設定

## 🎉 デプロイ完了

Cloudflare Pagesへのデプロイが完了しました!

- **Pages URL**: https://grocery-shopping-list.pages.dev
- **最新デプロイ**: https://0008dce5.grocery-shopping-list.pages.dev

## ⚙️ 必要な設定

Pagesでアプリが正常に動作するには、以下の設定が必要です:

### 1. KV名前空間のバインディング

1. [Cloudflare Dashboard](https://dash.cloudflare.com) にログイン
2. **Pages** → **grocery-shopping-list** プロジェクトを選択
3. **Settings** タブ → **Functions** セクション
4. **KV namespace bindings** で **Add binding** をクリック
5. 以下を入力:
   - Variable name: `SHOPLIST`
   - KV namespace: `shared-shopping-list` (ID: `389bc7f46e5b46448fc7ce82640da481`)
6. **Save** をクリック

### 2. 環境変数 (Secrets)

同じ **Functions** セクションで **Environment variables** を設定:

#### Production環境:
1. **Add variables** をクリック
2. 以下の変数を追加:

```
RAPIDAPI_KEY = <your-rapidapi-key-here>
OPENROUTER_API_KEY = <your-openrouter-api-key-here>
```

⚠️ **セキュリティ警告**: 実際のAPIキーは絶対にGitにコミットしないでください。
実際のキー値は Cloudflare Dashboard で直接設定してください。

3. **Encrypt** にチェック (シークレット情報として保存)
4. **Save** をクリック

### 3. 再デプロイ

設定後、最新のコードで再デプロイ:

```bash
npm run deploy:pages
```

または、両方同時にデプロイ:

```bash
npm run deploy:all
```

## 📝 npm スクリプト

```json
{
  "deploy": "wrangler deploy",           // Workersにデプロイ
  "deploy:pages": "...",                  // Pagesにデプロイ
  "deploy:all": "npm run deploy && npm run deploy:pages"  // 両方にデプロイ
}
```

## 🔗 デプロイ済みURL

- **Workers**: https://shared-shopping-list.grocery-shopping-list.workers.dev/
- **Pages**: https://grocery-shopping-list.pages.dev

両方のURLで同じアプリが動作します!

## 🚀 デプロイフロー

```bash
# Workersのみ
npm run deploy

# Pagesのみ  
npm run deploy:pages

# 両方に同時デプロイ (推奨)
npm run deploy:all
```

## 📌 注意事項

- Pagesでは`functions/_middleware.js`が自動的にすべてのリクエストを処理
- WorkersとPagesは同じ`src/worker.js`コードを共有
- KVストレージも同じ名前空間を共有
- 両方のプラットフォームで同じ機能が利用可能

## 🐛 トラブルシューティング

### Pagesでエラーが出る場合:

1. KVバインディングが正しく設定されているか確認
2. 環境変数(Secrets)が設定されているか確認
3. ブラウザのキャッシュをクリア (Cmd+Shift+R)
4. デプロイログを確認: `npx wrangler pages deployment tail grocery-shopping-list`

### 設定確認コマンド:

```bash
# Pagesプロジェクト情報を表示
npx wrangler pages project list

# 最新デプロイメント情報を表示
npx wrangler pages deployment list --project-name=grocery-shopping-list
```

## ✅ 完了チェックリスト

- [x] Pagesプロジェクト作成完了
- [x] 初回デプロイ完了
- [ ] KV名前空間バインディング設定
- [ ] 環境変数(Secrets)設定
- [ ] 機能テスト完了

設定完了後、両方のURLで動作確認してください! 🎊

# 🔐 RapidAPI統合セットアップガイド

## 📝 必要なAPIキー

このアプリはRapidAPI経由で以下のAPIを使用します:

1. **Coles Product Price API**
   - URL: https://rapidapi.com/data-holdings-group-data-holdings-group-default/api/coles-product-price-api
   
2. **Woolworths Products API**
   - URL: https://rapidapi.com/apidojo/api/woolworths-products

## 🚀 セットアップ手順

### 1. RapidAPIアカウント作成

1. https://rapidapi.com/ にアクセス
2. 無料アカウントを作成
3. 上記2つのAPIをSubscribe (無料プランでOK)

### 2. APIキーを取得

1. RapidAPIダッシュボードを開く
2. "My Apps" → デフォルトアプリケーションを選択
3. `X-RapidAPI-Key` をコピー

### 3. Cloudflare Workersにシークレットを設定

#### ローカル開発用

`.dev.vars` ファイルを作成:

```bash
# .dev.vars (ローカル開発用)
RAPIDAPI_KEY=your-rapidapi-key-here
OPENROUTER_API_KEY=your-openrouter-key-here
```

**重要**: このファイルは `.gitignore` に追加済みです。コミットしないでください!

#### 本番環境用

```bash
# RapidAPI キーを設定
wrangler secret put RAPIDAPI_KEY
# プロンプトが表示されたらAPIキーを入力

# OpenRouter キーも必要
wrangler secret put OPENROUTER_API_KEY
# プロンプトが表示されたらAPIキーを入力
```

### 4. 動作確認

#### ローカル環境

```bash
# ローカルサーバー起動
npm run dev

# 別ターミナルでテスト
curl "http://localhost:8787/api/specials-rapidapi"
```

#### 本番環境

```bash
# デプロイ
npm run deploy

# テスト
curl "https://shared-shopping-list.grocery-shopping-list.workers.dev/api/specials-rapidapi"
```

## 📊 APIレート制限

| API | 無料プラン | 制限 |
|-----|----------|------|
| Coles Product Price API | 1000 req/hour | 十分 |
| Woolworths Products API | 500-1000 req/hour | 十分 |

アプリは以下の対策を実装:
- 1時間のKVキャッシング
- リクエスト間の遅延(100ms)
- エラーハンドリング

## 🔄 モックデータとの切り替え

`src/catalog-api.js` で切り替え可能:

```javascript
// モックデータを使用
const USE_MOCK_DATA = true;

// RapidAPIを使用
const USE_MOCK_DATA = false;
```

または、新しいエンドポイントを使用:

- `/api/specials` - モックデータ
- `/api/specials-rapidapi` - 実際のRapidAPI

## 🧪 テストコマンド

```bash
# RapidAPIで特売取得
curl "http://localhost:8787/api/specials-rapidapi" | jq '.count, .specials[0:3]'

# RapidAPIで商品検索
curl "http://localhost:8787/api/search-rapidapi?q=milk" | jq '.results[0:3]'

# AIマッチング(RapidAPIデータ使用)
curl -X POST "http://localhost:8787/api/ai-match-rapidapi" \
  -H "Content-Type: application/json" \
  -d '{"items": ["牛肉", "牛乳"]}' | jq '.matches'
```

## 💰 コスト

### 無料プランで十分な理由

- 特売情報は1時間キャッシュ → 実際のAPI呼び出しは1日24回のみ
- 検索は各商品カテゴリ約10種類 → 1回の更新で20リクエスト程度
- ユーザー検索はキャッシュから → APIコール不要

**月間推定**: ~1,440リクエスト (十分無料枠内)

### 有料プランが必要になる場合

- ユーザーが1,000人以上
- リアルタイム価格更新が必要
- キャッシュを短くする必要がある

## 🐛 トラブルシューティング

### "Unauthorized" エラー

```bash
# APIキーが設定されているか確認
wrangler secret list

# 設定されていない場合
wrangler secret put RAPIDAPI_KEY
```

### "Rate limit exceeded" エラー

- 1時間待つ
- または有料プランにアップグレード
- キャッシュ時間を延長 (CACHE_DURATION を増やす)

### "No results" エラー

- APIが正常に動作しているか確認
- RapidAPIダッシュボードでAPIステータスを確認
- モックデータに切り替えて開発継続

## 📚 参考リンク

- [RapidAPI Documentation](https://docs.rapidapi.com/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

**次のステップ**: APIキーを取得したら、`LOCAL_DEVELOPMENT.md` に従ってローカルテストを開始!

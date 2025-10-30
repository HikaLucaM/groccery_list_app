# 🔧 ローカル開発環境セットアップ

## ✅ 現在の状況

**重要**: 今まで本番環境(`https://shared-shopping-list.grocery-shopping-list.workers.dev`)に直接デプロイしていました。

これからは**ローカル環境**で開発とテストを行い、準備ができたら本番にデプロイします。

## 🚀 ローカル開発の開始

### 1. ローカルサーバーを起動

```bash
# ターミナル1で実行(サーバーを起動したまま)
npm run dev
```

これで `http://localhost:8787` でローカル版が起動します。

**重要**: このターミナルは開いたままにしておく必要があります!

### 2. 別のターミナルでテスト

```bash
# ターミナル2で実行
# 特売情報
curl "http://localhost:8787/api/specials" | jq '.'

# 商品検索
curl "http://localhost:8787/api/search?q=beef" | jq '.'

# AIマッチング
curl -X POST "http://localhost:8787/api/ai-match" \
  -H "Content-Type: application/json" \
  -d '{"items": ["牛肉", "牛乳"]}' | jq '.'
```

### 3. ブラウザで確認

```bash
# ブラウザを開く
open http://localhost:8787
```

## 📁 環境の違い

| 項目 | ローカル環境 | 本番環境 |
|------|------------|---------|
| URL | `http://localhost:8787` | `https://shared-shopping-list.grocery-shopping-list.workers.dev` |
| KV | ローカルシミュレーション | 実際のCloudflare KV |
| デバッグ | コンソールログが見える | ログは Cloudflare Dashboard |
| 影響範囲 | 自分のPCのみ | 全ユーザー |
| デプロイ | 不要 | `npm run deploy` が必要 |

## 🧪 テストスクリプト

便利なテストスクリプトを用意しました:

```bash
# 全APIをテスト
./test-local.sh
```

## 🔄 開発フロー

### 推奨ワークフロー

```
1. コード変更
   ↓
2. ローカルでテスト (npm run dev)
   ↓
3. 動作確認 (curl or ブラウザ)
   ↓
4. 問題なければ
   ↓
5. 本番デプロイ (npm run deploy)
```

### ホットリロード

wrangler devはホットリロードに対応しています:
- コードを変更して保存
- 自動的に再読み込み
- すぐに `http://localhost:8787` でテスト可能

## 📝 現在実装中の機能

### AIセマンティック検索

ユーザー入力とカタログの商品名が完全一致しない問題を解決:

```
ユーザー入力: "牛肉"
    ↓ AIマッチング
カタログ: "Australian Beef Mince"
         "Beef Scotch Fillet"
```

### 実装したAPI

1. **`POST /api/ai-match`** - AIによる商品マッチング
   ```json
   {
     "items": ["牛肉", "牛乳", "パン"]
   }
   ```
   
   レスポンス:
   ```json
   {
     "status": "success",
     "matches": [
       {
         "userInput": "牛肉",
         "bestMatch": {
           "name": "Australian Beef Mince",
           "price": 8.00,
           "wasPrice": 12.00,
           "onSpecial": true,
           "store": "Woolies"
         }
       }
     ],
     "totalSavings": 15.50
   }
   ```

2. **`POST /api/generate` (拡張)** - 価格情報を自動付加
   - AIが生成したリストに自動的にカタログ価格を追加
   - 特売情報も含む

### マッチング手法

1. **AIマッチング** (優先)
   - LLM (Llama) でセマンティック検索
   - 日本語 → 英語商品名の自動マッピング
   
2. **キーワードマッチング** (フォールバック)
   - 辞書ベースの変換
   - 高速で確実

3. **ハイブリッド**
   - AI優先、失敗時はキーワード
   - 両方の利点を活用

## 🧪 ローカルテスト例

### ターミナル1: サーバー起動
```bash
npm run dev

# 出力:
# Ready on http://localhost:8787
```

### ターミナル2: テスト実行

```bash
# 1. 特売情報
curl -s "http://localhost:8787/api/specials" | \
  jq '.count, .specials[0] | {name, price, store}'

# 2. AIマッチング
curl -s -X POST "http://localhost:8787/api/ai-match" \
  -H "Content-Type: application/json" \
  -d '{"items": ["牛肉", "牛乳", "パン"]}' | \
  jq '.matches[] | {userInput, match: .bestMatch.name, price: .bestMatch.price}'

# 3. AI生成(特売 + 価格込み)
curl -s -X POST "http://localhost:8787/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "週末のバーベキュー", 
    "token": "test1234567890abc",
    "useSpecials": true
  }' | \
  jq '.suggestions[] | {label, price, store, onSpecial}'
```

## 🐛 デバッグ

### ローカルサーバーのログ

ターミナル1(npm run dev)で、すべてのリクエストとエラーが表示されます:

```
[wrangler:inf] GET /api/specials 200 OK (45ms)
[wrangler:inf] POST /api/ai-match 200 OK (1234ms)
[wrangler:err] Error in handleAIMatch: ...
```

### KVストレージの確認

ローカルKVはシミュレートされています:
- `~/.wrangler/state/` にローカルデータが保存される
- 本番KVには影響なし

## ✅ 本番デプロイ

ローカルテストで問題なければ:

```bash
npm run deploy
```

## 📊 現在の実装状況

- [x] モックカタログデータ
- [x] 商品検索API
- [x] AIマッチングAPI  
- [x] AI生成 + 価格統合
- [x] ローカル開発環境
- [ ] フロントエンドUI統合
- [ ] 本番デプロイ

## 🎯 次のステップ

1. ローカルでAIマッチング機能をテスト
2. フロントエンドUIに統合
3. 完全動作確認
4. 本番にデプロイ

---

**現在はローカル環境で安全に開発できます!** 🎉

本番環境への影響を気にせず、自由に実験できます。

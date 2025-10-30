# 📊 Catalog API Integration - Implementation Guide

## 🎯 実装された機能

### 1. カタログAPI統合モジュール (`src/catalog-api.js`)
- **WoolworthsとColesのAPIから特売情報を取得**
- **商品検索機能** - 商品名で両店舗を検索
- **価格比較機能** - 同じ商品の価格を比較
- **キャッシング** - 1時間のKVキャッシュで API呼び出しを削減

### 2. 新しいAPIエンドポイント

#### `GET /api/specials`
現在の特売情報を取得
```json
{
  "status": "success",
  "specials": [
    {
      "name": "牛肉",
      "price": 12.50,
      "wasPrice": 18.00,
      "onSpecial": true,
      "store": "Woolies",
      "brand": "Australian Beef",
      "size": "500g"
    }
  ],
  "count": 36,
  "cached": true
}
```

#### `GET /api/search?q=<product_name>`
商品を検索
```json
{
  "status": "success",
  "query": "牛乳",
  "results": [
    {
      "name": "牛乳 3L",
      "price": 4.50,
      "wasPrice": null,
      "onSpecial": false,
      "store": "Coles"
    }
  ]
}
```

#### `POST /api/match`
ショッピングリストのアイテムとカタログを照合
```json
{
  "items": [
    { "id": "uuid", "label": "牛乳" }
  ]
}
```

Response:
```json
{
  "status": "success",
  "matches": [
    {
      "itemId": "uuid",
      "itemLabel": "牛乳",
      "catalogMatch": {
        "name": "牛乳 3L",
        "price": 4.50,
        "store": "Coles"
      },
      "alternatives": [...]
    }
  ],
  "totalSavings": 15.50
}
```

### 3. AI統合機能

#### 特売情報を使ったAI生成
`POST /api/generate` に新しいパラメータ `useSpecials` を追加:

```json
{
  "prompt": "平日5日分の夕食の買い物リスト",
  "token": "your-token-here",
  "useSpecials": true
}
```

- `useSpecials: true` の場合、AIは現在の特売情報を考慮してリストを生成
- 特売商品を優先的に使用
- コスト効率の高いリストを作成

## 🎨 フロントエンド機能

### 実装予定の UI コンポーネント:

1. **特売情報セクション**
   - ヘッダー下部に今週の特売を表示
   - Woolies/Coles のタブ切り替え
   - 特売商品をタップして簡単にリストに追加

2. **価格バッジ**
   - 各アイテムに価格情報を表示
   - 特売商品には赤いバッジ
   - 元の価格も表示(割引額がわかる)

3. **AI生成時のオプション**
   - "特売商品を優先" チェックボックス
   - 特売情報を使用した場合、何件の特売が使われたかを表示

4. **価格比較ビュー**
   - 商品をタップすると詳細モーダル
   - Woolies vs Coles の価格比較
   - どちらの店舗が安いか一目でわかる

## 🚀 デプロイ方法

### 1. コードをデプロイ

```bash
# Worker をデプロイ
npm run deploy
```

### 2. 環境変数の設定

既存の `OPENROUTER_API_KEY` はそのまま使用:

```bash
# 既に設定済み
wrangler secret list
```

### 3. テスト

```bash
# ローカルでテスト
npm run dev

# 特売情報を取得
curl http://localhost:8787/api/specials

# 商品検索
curl "http://localhost:8787/api/search?q=牛乳"

# AI生成(特売情報込み)
curl -X POST http://localhost:8787/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "今週の特売を使った夕食5日分",
    "token": "test1234567890abc",
    "useSpecials": true
  }'
```

## 📝 次のステップ

### フロントエンド実装

特売情報とprice比較UIをindex.htmlに追加する必要があります:

1. **特売情報の表示**
   - ヘッダー下部に特売セクション追加
   - `/api/specials` から特売情報を取得
   - グリッドレイアウトで表示

2. **価格バッジの追加**
   - `/api/match` でリストアイテムとカタログを照合
   - 各アイテムに価格情報を表示

3. **AI生成オプション**
   - AIモーダルに "特売を使う" チェックボックス追加
   - `useSpecials: true` でAPIを呼び出し

### JavaScript実装例

```javascript
// 特売情報を取得
async function loadSpecials() {
  try {
    const response = await fetch(`${API_BASE}/api/specials`);
    const data = await response.json();
    
    if (data.status === 'success') {
      displaySpecials(data.specials);
    }
  } catch (error) {
    console.error('Failed to load specials:', error);
  }
}

// 価格情報を取得
async function matchPrices() {
  try {
    const response = await fetch(`${API_BASE}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: listData.items })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      updatePriceBadges(data.matches);
      showTotalSavings(data.totalSavings);
    }
  } catch (error) {
    console.error('Failed to match prices:', error);
  }
}
```

## ⚠️ 注意事項

### API制限
- Woolworths/Coles APIは非公式
- レート制限がある可能性
- APIが変更される可能性

### 対策
- KVキャッシュで呼び出し回数を削減(1時間)
- エラーハンドリングの実装
- フォールバック機能(API失敗時も動作)

### 今後の改善案
- 公式APIが利用可能になったら移行
- より多くのスーパーマーケットを追加(ALDI, IGA)
- 価格履歴機能
- 価格アラート機能

## 🎉 まとめ

バックエンドの実装は完了しました!

✅ カタログAPI統合モジュール  
✅ 新しいAPIエンドポイント  
✅ AI + 特売統合機能  
✅ 価格比較機能  
✅ キャッシング機能  

次は、フロントエンド(index.html)に特売情報と価格バッジのUIを追加すれば完成です!

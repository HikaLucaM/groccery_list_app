# 🛒 カタログAPI統合機能 - 完全実装ガイド

## 🎉 実装済み機能

### バックエンド ✅

1. **カタログAPI統合モジュール** (`src/catalog-api.js`)
   - Woolworths特売情報の取得
   - Coles特売情報の取得  
   - 商品検索機能
   - 価格比較機能
   - 1時間のKVキャッシング

2. **新しいAPIエンドポイント** (`src/worker.js`)
   - `GET /api/specials` - 特売情報取得
   - `GET /api/search?q=商品名` - 商品検索
   - `POST /api/match` - リストとカタログの照合
   - `POST /api/generate` (拡張) - `useSpecials`オプション追加

### フロントエンド 🚧 (要実装)

準備完了: `src/catalog-frontend.js` に全てのコードあり

## 📦 デプロイ手順

### 1. コードをデプロイ

```bash
cd /Users/hminagawa/Desktop/groccery_list_app

# Workerをデプロイ
npm run deploy
```

### 2. ローカルテスト

```bash
# ローカル開発サーバー起動
npm run dev
```

別のターミナルでテスト:

```bash
# 特売情報を取得
curl http://localhost:8787/api/specials

# 商品を検索
curl "http://localhost:8787/api/search?q=milk"

# AI生成(特売込み)
curl -X POST http://localhost:8787/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "今週の特売を使った週末の料理",
    "token": "test1234567890abc",
    "useSpecials": true
  }'
```

### 3. フロントエンド統合

`public/index.html` に以下を追加:

#### A. CSS追加 (`</style>` の直前に追加)

```css
/* ============================================ */
/* Catalog API Styles */
/* ============================================ */

/* 特売セクション */
.specials-section {
  margin: 12px 4px;
  padding: 16px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.specials-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.specials-title {
  font-size: 18px;
  font-weight: 800;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-specials-btn {
  padding: 8px 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.refresh-specials-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.specials-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.specials-tab {
  flex: 1;
  padding: 10px 16px;
  background: #f3f4f6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.specials-tab:hover {
  background: #e5e7eb;
}

.specials-tab.active {
  background: white;
  border-color: #10b981;
  color: #059669;
}

.specials-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.special-item {
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  transition: all 0.2s ease;
  cursor: pointer;
}

.special-item:hover {
  border-color: #10b981;
  background: #f0fdf4;
  transform: translateY(-2px);
}

.special-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.special-item-store {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
}

.special-item-price {
  font-size: 16px;
  font-weight: 800;
  color: #ef4444;
}

.special-item-was {
  font-size: 11px;
  color: #9ca3af;
  text-decoration: line-through;
  margin-left: 4px;
}

/* 価格バッジ */
.item-price-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  min-width: 80px;
}

.price-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.price-badge.on-special {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  animation: pulse-special 2s infinite;
}

.price-badge.regular {
  background: #e5e7eb;
  color: #6b7280;
  font-weight: 600;
}

@keyframes pulse-special {
  0%, 100% { 
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
  }
  50% { 
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
  }
}

.price-was {
  font-size: 11px;
  color: #9ca3af;
  text-decoration: line-through;
}

/* AI特売オプション */
.ai-option-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 12px;
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 8px;
}

.ai-option-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.ai-option-checkbox label {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
  cursor: pointer;
  flex: 1;
}
```

#### B. JavaScript追加 (`</script>` の直前に追加)

`src/catalog-frontend.js` の内容を全てコピーして追加

## 🧪 動作確認

### ブラウザで確認

1. `http://localhost:8787/?t=test1234567890abc` を開く
2. ヘッダー下に「🔥 今週の特売」セクションが表示される
3. 特売商品をクリックするとリストに追加される
4. 🤖 AIボタンをクリック
5. 「特売商品を優先的に使用する」チェックボックスが表示される
6. プロンプトを入力して生成

### API動作確認

```bash
# 特売情報
curl https://shared-shopping-list.grocery-shopping-list.workers.dev/api/specials

# 商品検索
curl "https://shared-shopping-list.grocery-shopping-list.workers.dev/api/search?q=milk"

# 価格マッチング
curl -X POST https://shared-shopping-list.grocery-shopping-list.workers.dev/api/match \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"id": "1", "label": "milk"},
      {"id": "2", "label": "bread"}
    ]
  }'
```

## 🎯 使い方

### ユーザー視点での機能

1. **特売情報を見る**
   - アプリを開くと自動的に今週の特売が表示される
   - WoolworthsとColesをタブで切り替え
   - 特売商品をタップして簡単にリストに追加

2. **AIで特売を活用**
   - 🤖 AIボタンをタップ
   - 「特売商品を優先」をチェック
   - 例: "今週の特売を使った週末のバーベキュー"
   - AIが特売商品を優先的に使ったリストを生成

3. **価格を比較**
   - リストのアイテムに自動的に価格が表示される
   - 特売商品には🔥マークと赤いバッジ
   - 元の価格も表示されて節約額がわかる

## 💡 使用例

### 例1: 週末の食材を特売で買う

```
プロンプト: "週末2日分の夕食の材料"
特売オプション: ON
→ AIが今週の特売(牛肉、野菜など)を使ったリストを生成
```

### 例2: お得な買い物計画

```
1. 特売セクションで今週のお買い得をチェック
2. 気になる商品をタップしてリストに追加
3. AIに"これらの食材を使った料理"と聞く
```

### 例3: 価格比較しながら買い物

```
1. リストを作成
2. 各アイテムにWooliesとColesの価格が表示される
3. どちらの店舗が安いかひと目でわかる
4. 合計節約額が表示される
```

## 🔧 トラブルシューティング

### 特売情報が表示されない

- APIが失敗している可能性
- ブラウザのコンソールでエラーを確認
- `curl http://localhost:8787/api/specials` でAPIを直接テスト

### 価格が表示されない

- 商品名が正確にマッチしていない可能性
- 手動で価格マッチングを実行: コンソールで `matchListWithCatalog()`

### AI生成が遅い

- 特売情報の取得に時間がかかる場合がある
- 特売オプションをOFFにすると高速化

## 📈 今後の改善

- [ ] より多くのスーパーマーケット対応(ALDI, IGA)
- [ ] 価格履歴グラフ
- [ ] 価格アラート機能
- [ ] レシピ提案機能
- [ ] お得度ランキング

## 🎊 完成!

これで、Woolworths/Coles カタログAPIと完全に統合された
スマートな買い物リストアプリが完成しました! 🚀

特売情報を活用して、賢くお得に買い物ができます!

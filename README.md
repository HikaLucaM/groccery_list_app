# Shared Shopping List

夫婦やパートナーとURLだけで共有できるシンプルな買い物リストアプリです。認証なし、トークンベースで動作し、Cloudflare Workers + KVで構築されています。

## 特徴

- 🔗 **URLベースの共有**: 認証不要。URLの`?t=<token>`パラメータが秘密鍵として機能
- ✅ **シンプルなUI**: 追加、チェック、削除の基本操作のみ
- 🔍 **フィルタ機能**: デフォルトは未チェック項目のみ表示。切り替えで全件表示可能
- 📱 **モバイル対応**: レスポンシブデザインでスマホでも使いやすい
- 💰 **無料枠で動作**: Cloudflareの無料プランで十分に運用可能

## 前提条件

- Node.js (v18以上推奨)
- Cloudflare アカウント
- Wrangler CLI (プロジェクトに含まれています)

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. KV名前空間の作成

Cloudflare KVストレージを使用するため、名前空間を作成します。

```bash
npx wrangler kv:namespace create SHOPLIST
```

実行すると次のような出力が得られます:

```
🌀 Creating namespace with title "shared-shopping-list-SHOPLIST"
✨ Success!
Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "SHOPLIST"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. wrangler.tomlの更新

`wrangler.toml`ファイルを開き、`YOUR_KV_NAMESPACE_ID`を上記で生成されたIDに置き換えてください。

プレビュー用の名前空間も作成することをお勧めします:

```bash
npx wrangler kv:namespace create SHOPLIST --preview
```

生成された`preview_id`も`wrangler.toml`に設定してください。

### 4. ローカル開発

```bash
npm run dev
```

これにより`http://localhost:8787`でWorkerが起動します。

### 5. Cloudflare Workersへのデプロイ

```bash
npm run deploy
```

デプロイが成功すると、次のような出力が表示されます:

```
Published shared-shopping-list (X.XX sec)
  https://shared-shopping-list.your-subdomain.workers.dev
```

このURLがあなたのAPIエンドポイントになります。

### 6. フロントエンドの設定

`index.html`を開き、`API_BASE`定数を上記でデプロイしたWorkerのURLに置き換えてください:

```javascript
// 変更前
const API_BASE = 'https://your-worker.your-subdomain.workers.dev';

// 変更後（例）
const API_BASE = 'https://shared-shopping-list.your-subdomain.workers.dev';
```

### 7. フロントエンドのホスティング

`index.html`を任意の静的ホスティングサービスに配置します:

- **Cloudflare Pages** (推奨)
  ```bash
  npx wrangler pages deploy . --project-name=shopping-list
  ```

- **GitHub Pages**
  - リポジトリの設定でGitHub Pagesを有効化
  - `index.html`をルートまたは`docs`フォルダに配置

- **Netlify / Vercel**
  - ドラッグ&ドロップで`index.html`をデプロイ

- **ローカルファイル**
  - `index.html`をダブルクリックで直接開くことも可能（ブラウザのCORS制限に注意）

## 使い方

### 1. アクセス

デプロイしたフロントエンドのURLにアクセスします。初回アクセス時、自動的にトークンが生成され、URLに`?t=<token>`が付与されます。

### 2. 共有

表示されているURLをそのままコピーして、パートナーと共有します。同じURLにアクセスすれば、同じリストを共同編集できます。

### 3. 操作

- **追加**: 入力欄にアイテム名を入力して「追加」ボタンまたはEnterキー
- **チェック**: アイテムをクリック、またはチェックボックスをON/OFF
- **削除**: 各アイテムの「削除」ボタンをクリック
- **フィルタ**: 右上のセレクトボックスで「未チェックのみ」「すべて」を切り替え

### 4. デフォルト動作

- 未チェック項目が上に、チェック済み項目が下に自動的にソートされます
- デフォルトではチェック済み項目は非表示（フィルタで表示可能）
- チェック済み項目は打ち消し線で表示されます

## API仕様

### エンドポイント

すべてのエンドポイントは`/api/list/:token`の形式です。`:token`は16文字以上の英数字、アンダースコア、ハイフンで構成されます。

### GET /api/list/:token

リストを取得します。存在しない場合はデフォルトの空リストを返します。

**レスポンス例:**
```json
{
  "title": "Shopping",
  "items": [
    {
      "id": "uuid-here",
      "label": "牛乳",
      "checked": false,
      "pos": 0,
      "updated_at": 1234567890000
    }
  ]
}
```

### PUT /api/list/:token

リストを更新します。

**リクエストボディ:**
```json
{
  "title": "Shopping",
  "items": [...]
}
```

**レスポンス:**
```json
{
  "ok": true
}
```

### DELETE /api/list/:token

リストを削除します。

**レスポンス:**
```json
{
  "ok": true
}
```

## セキュリティについて

⚠️ **重要な注意事項**

- URLは事実上の鍵です。第三者と共有しないでください
- URLが漏洩した場合:
  1. 新しいトークンでURLを発行（ブラウザでクエリパラメータを削除してアクセス）
  2. 必要に応じて旧トークンをDELETEエンドポイントで削除
- このアプリは個人利用・家族間での利用を想定しています
- 機密情報は保存しないでください

## トラブルシューティング

### CORSエラーが発生する

- `wrangler.toml`の`compatibility_date`が最新か確認
- Worker側でCORSヘッダーが正しく設定されているか確認

### データが保存されない

- KV名前空間が正しく設定されているか確認
- Cloudflareのダッシュボードでデプロイが成功しているか確認
- ブラウザの開発者ツールでネットワークエラーを確認

### トークンが生成されない

- ブラウザがJavaScriptを有効にしているか確認
- `crypto.getRandomValues`と`crypto.randomUUID`がサポートされているか確認（モダンブラウザでは問題なし）

## ライセンス

MIT

## 開発者向け情報

### プロジェクト構成

```
/
├── src/
│   └── worker.js          # Cloudflare Worker API
├── index.html             # フロントエンド（静的HTML）
├── wrangler.toml          # Cloudflare設定
├── package.json           # npm設定とスクリプト
└── README.md              # このファイル
```

### データ構造

KVには`list:<token>`というキーで以下のJSON構造が保存されます:

```typescript
type ListDoc = {
  title: string
  items: Array<{
    id: string         // UUID
    label: string      // アイテム名
    checked: boolean   // チェック状態
    pos: number        // 並び順（0から連番）
    updated_at: number // タイムスタンプ
  }>
}
```

### カスタマイズ

- `index.html`のCSS部分を編集してデザインを変更
- `listData.title`の初期値を変更してリスト名をカスタマイズ
- Worker側でバリデーションやレート制限を追加

---

Enjoy your shared shopping! 🛒

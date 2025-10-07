# Shared Shopping List 🛒

シンプルで使いやすい、夫婦やパートナーと共有できる買い物リストアプリです。認証不要、URLだけで簡単に共有できます。

[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy%20to-Cloudflare-orange?logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🌟 デモ

**👉 [アプリを試す](https://main.shopping-list-app-8to.pages.dev)**
<img width="200" height="450" alt="image" src="https://github.com/user-attachments/assets/614382c5-cb0f-4f96-8269-0bff2f3e1313" />


## ✨ 特徴

- 🔗 **認証不要**: URLの`?t=<token>`パラメータが秘密鍵として機能
- 🔄 **自動更新**: 7秒間隔で自動的に更新、他のユーザーの変更をリアルタイムで反映
- 🏷️ **タグ機能**: アイテムにタグを付けて分類・フィルタリング可能（Woolies、Coles、ALDI等のプリセット + カスタムタグ）
- ✅ **シンプルUI**: 追加、チェックの基本操作のみ（チェックで自動非表示）
- 🔍 **フィルタ機能**: 未チェック項目のみ/全て表示、タグ別フィルタリング
- 📱 **モバイル最適化**: 片手操作に最適化、下部固定入力バー、タップしやすい大きなボタン
- ☁️ **クラウド保存**: Cloudflare KVでデータを永続化
- 💰 **無料で運用**: Cloudflareの無料プランで十分に動作
- 🚀 **高速**: エッジネットワークで世界中どこでも高速アクセス

## 🏗️ 技術スタック

- **フロントエンド**: Vanilla JavaScript（ビルド不要）
- **バックエンド**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **データベース**: [Cloudflare KV](https://developers.cloudflare.com/kv/)
- **ホスティング**: [Cloudflare Pages](https://pages.cloudflare.com/)

## 🚀 クイックスタート

### 前提条件

- [Node.js](https://nodejs.org/) v18以上
- [Cloudflareアカウント](https://dash.cloudflare.com/sign-up)（無料）

### デプロイ手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/あなたのユーザー名/grocery_list_app.git
cd grocery_list_app

# 2. 依存関係をインストール
npm install

# 3. Cloudflareにログイン
npx wrangler login

# 4. KV名前空間を作成
npx wrangler kv:namespace create SHOPLIST
# 出力されたIDをメモして、wrangler.tomlのidフィールドに設定

npx wrangler kv:namespace create SHOPLIST --preview
# 出力されたpreview_idをwrangler.tomlに設定

# 5. wrangler.tomlを編集
# [[kv_namespaces]]セクションのidとpreview_idを上記で生成された値に置き換える

# 6. Workersをデプロイ
npm run deploy
# デプロイされたWorkerのURLをメモ（例: https://your-worker.your-subdomain.workers.dev）

# 7. index.htmlを編集
# API_BASE定数をデプロイされたWorkerのURLに変更

# 8. 静的ファイルをデプロイ用に準備
mkdir -p public && cp index.html public/

# 9. Cloudflare Pagesにデプロイ
npx wrangler pages deploy public --project-name=shopping-list-app
```

## 📖 使い方

### 1. アクセス

デプロイしたURL（例: `https://main.shopping-list-app-8to.pages.dev`）にアクセスします。

初回アクセス時、自動的にトークンが生成され、URLに`?t=<ランダムなトークン>`が付与されます。

### 2. 共有

表示されているURLをそのままコピーして、パートナーと共有します。同じURLにアクセスすれば、同じリストを共同編集できます。

### 3. 操作

- **追加**: 画面下部の入力欄にアイテム名を入力、必要に応じて横のタグドロップダウンからタグを選択して「追加」ボタンまたはEnterキー
- **タグ設定**: アイテム追加時にドロップダウンからタグを選択（Woolies、Coles、ALDI、IGA、Asian Grocery、Chemist、Kmart から選択可能）
- **カスタムタグ**: 「+」ボタンから独自のタグを追加可能（localStorageに保存され、次回も使用可能）
- **編集**: アイテムをタップすると編集モーダルが開き、アイテム名とタグを変更可能
- **チェック**: 右側のチェックボックスをON/OFF（チェックすると自動的に非表示）
- **フィルタ**: ヘッダーのセレクトボックスで「未チェックのみ」「すべて」を切り替え、タグでフィルタリング
- **URLコピー**: 共有URLの横の「コピー」ボタンをタップ

### 4. 自動更新

- **リアルタイム同期**: 7秒間隔で自動的にサーバーから最新データを取得
- **同期インジケーター**: タイトル横の緑の点が点滅している時は同期中
- **楽観的UI**: 操作は即座に画面に反映され、バックグラウンドで保存
- **競合回避**: 保存中はポーリングをスキップして競合を防止

### 5. デフォルト動作

- 未チェック項目が上に、チェック済み項目が下に自動的にソートされます
- デフォルトではチェック済み項目は非表示（フィルタで表示可能）
- チェック済み項目は打ち消し線で表示されます
- 全て表示モードでは、チェック済み項目は最近チェックした順に表示（誤ってチェックしたアイテムを見つけやすい）

## 📁 プロジェクト構成

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions CI/CD
├── src/
│   └── worker.js          # Cloudflare Worker API
├── index.html             # フロントエンド（静的HTML）
├── wrangler.toml          # Cloudflare設定
├── package.json           # npm設定とスクリプト
├── CHANGELOG.md           # 変更履歴
├── CICD_SETUP.md          # CI/CD設定ガイド
├── .gitignore             # Git除外設定
├── LICENSE                # ライセンス
└── README.md              # このファイル
```

## 🔧 API仕様

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
      "tags": ["Woolies"],
      "pos": 0,
      "updated_at": 1234567890000
    }
  ]
}
```

**フィールド説明:**
- `tags`: 文字列の配列。空配列も可（後方互換性あり）。各アイテムは1つのタグのみ推奨。

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

## 🔒 セキュリティについて

⚠️ **重要な注意事項**

- **URLは事実上の鍵です**。第三者と共有しないでください
- URLが漏洩した場合:
  1. 新しいトークンでURLを発行（ブラウザでクエリパラメータを削除してアクセス）
  2. 必要に応じて旧トークンをDELETEエンドポイントで削除
- このアプリは**個人利用・家族間での利用**を想定しています
- **機密情報は保存しない**でください

### GitHub公開について

このリポジトリは安全に公開できます：

- ✅ KV名前空間IDは公開しても問題ありません（アクセスキーではないため）
- ✅ Worker URLも公開可能（トークンがないとデータにアクセスできない）
- ✅ 環境変数や秘密鍵は含まれていません
- ⚠️ デプロイ後のトークン付きURLは共有しないように注意

## 💡 カスタマイズ

### タグのカスタマイズ

プリセットタグは以下の7種類が用意されています：
- Woolies（緑）
- Coles（赤）
- ALDI（青）
- IGA（紫）
- Asian Grocery（オレンジ）
- Chemist（ピンク）
- Kmart（シアン）

カスタムタグは「+タグ」ボタンから追加でき、グレー系の色で表示されます。カスタムタグはlocalStorageに保存され、ブラウザごとに保持されます。

タグの色を変更したい場合は、`index.html`の`TAG_COLORS`オブジェクトとCSSの`.tag-*`クラスを編集してください。

### 自動更新間隔の変更

`index.html`の`POLL_INTERVAL_MS`定数を変更してポーリング間隔を調整できます（デフォルト: 7000ms）。

```javascript
const POLL_INTERVAL_MS = 10000; // 10秒間隔に変更
```

### デザイン変更

`index.html`の`<style>`セクションを編集してデザインをカスタマイズできます。

### リスト名の変更

`index.html`の`listData.title`初期値を変更するか、Worker側で別のデフォルト値を設定できます。

### バリデーション追加

`src/worker.js`でリクエストのバリデーションやレート制限を追加できます。

## 🐛 トラブルシューティング

### CORSエラーが発生する

- Worker側でCORSヘッダーが正しく設定されているか確認
- `wrangler.toml`の`compatibility_date`が適切か確認

### データが保存されない

- KV名前空間が正しく設定されているか確認
- Cloudflareのダッシュボードでデプロイが成功しているか確認
- ブラウザの開発者ツールでネットワークエラーを確認

### トークンが生成されない

- ブラウザがJavaScriptを有効にしているか確認
- `crypto.getRandomValues`と`crypto.randomUUID`がサポートされているか確認（モダンブラウザは対応）

### SSL/TLS エラー

- DNS設定の伝搬を待つ（5-10分程度）
- ブラウザのキャッシュをクリア
- シークレットモードで試す

## 📄 ライセンス

[MIT License](LICENSE) - 自由に使用、改変、配布できます。

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📮 お問い合わせ

質問や提案がある場合は、[Issues](https://github.com/あなたのユーザー名/grocery_list_app/issues)を開いてください。

---

Made with ❤️ using Cloudflare Workers

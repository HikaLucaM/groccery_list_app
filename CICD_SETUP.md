# GitHub Actions CI/CD セットアップガイド

このガイドでは、GitHubのmainブランチにpushするたびに自動的にCloudflareにデプロイされるCI/CDパイプラインをセットアップする方法を説明します。

## 🔑 必要なシークレット

GitHub Actionsで使用するために、以下の2つのシークレットをGitHubリポジトリに設定する必要があります：

1. `CLOUDFLARE_API_TOKEN`
2. `CLOUDFLARE_ACCOUNT_ID`

## 📝 ステップ1: Cloudflare API トークンの取得

### 1.1 Cloudflareダッシュボードにログイン

https://dash.cloudflare.com にアクセスしてログイン

### 1.2 API トークンを作成

1. 右上のプロフィールアイコンをクリック → **My Profile**
2. 左メニューから **API Tokens** を選択
3. **Create Token** ボタンをクリック
4. **Custom token** の **Get started** をクリック

### 1.3 トークンの設定

以下の権限を設定します：

**Token name:** `GitHub Actions Deploy`

**Permissions:**
- Account → Cloudflare Pages → Edit
- Account → Account Settings → Read
- Zone → Workers KV Storage → Edit
- Zone → Workers Scripts → Edit

**Account Resources:**
- Include → Your account name

**Zone Resources:**
- Include → All zones (または特定のゾーン)

### 1.4 トークンをコピー

**Continue to summary** → **Create Token** をクリックしてトークンを生成し、**必ずコピーして安全な場所に保存**してください（この画面は二度と表示されません）。

## 📝 ステップ2: Cloudflare Account IDの取得

1. Cloudflareダッシュボード (https://dash.cloudflare.com) にアクセス
2. 左メニューから **Workers & Pages** を選択
3. 右側に表示される **Account ID** をコピー

または、URLから取得することもできます：
- URL: `https://dash.cloudflare.com/【ここがAccount ID】/workers`

## 📝 ステップ3: GitHubシークレットの設定

### 3.1 GitHubリポジトリの設定画面へ

1. GitHubリポジトリページ (https://github.com/HikaLucaM/groccery_list_app) にアクセス
2. **Settings** タブをクリック
3. 左メニューから **Secrets and variables** → **Actions** を選択

### 3.2 シークレットを追加

**New repository secret** ボタンをクリックして、以下の2つを追加：

#### シークレット1:
- **Name:** `CLOUDFLARE_API_TOKEN`
- **Secret:** ステップ1.4でコピーしたAPIトークン

#### シークレット2:
- **Name:** `CLOUDFLARE_ACCOUNT_ID`
- **Secret:** ステップ2で取得したAccount ID

## ✅ 完了！

これで設定は完了です。mainブランチにpushすると、自動的に以下が実行されます：

1. ✅ Cloudflare Workersにバックエンドをデプロイ
2. ✅ Cloudflare Pagesにフロントエンドをデプロイ

## 🚀 テスト

設定が完了したら、コミットしてpushしてみましょう：

```bash
git add .
git commit -m "🚀 Add CI/CD with GitHub Actions"
git push origin main
```

GitHubの **Actions** タブでデプロイの進行状況を確認できます。

## 🔧 トラブルシューティング

### デプロイが失敗する場合

1. **Actions** タブでエラーログを確認
2. API トークンの権限が正しいか確認
3. Account IDが正しいか確認
4. Cloudflareの無料枠の制限に達していないか確認

### API トークンの権限エラー

もし権限エラーが出た場合は、以下の権限が含まれているか確認：
- Account → Cloudflare Pages → Edit
- Zone → Workers Scripts → Edit
- Zone → Workers KV Storage → Edit

### その他の問題

GitHubの **Issues** でお気軽にお問い合わせください。

---

Happy Deploying! 🎉

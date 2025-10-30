# 🔒 セキュリティガイドライン

## ⚠️ 重要: APIキーとシークレットの管理

このプロジェクトでは複数のAPIキーとシークレット情報を使用します。
**絶対にGitリポジトリにコミットしないでください。**

## 🚫 絶対にコミットしてはいけないもの

### 1. APIキー・トークン
- OpenRouter APIキー (`sk-or-v1-...`)
- RapidAPI キー
- その他のサードパーティAPIキー
- Cloudflare API トークン

### 2. 環境変数ファイル
- `.dev.vars` (ローカル開発用)
- `.env`
- `.env.local`
- `.env.production`

### 3. 認証情報
- パスワード
- プライベートキー
- 証明書
- セッショントークン

## ✅ 正しい管理方法

### ローカル開発環境

1. **`.dev.vars.example`をコピー**:
```bash
cp .dev.vars.example .dev.vars
```

2. **実際のAPIキーを`.dev.vars`に設定**:
```bash
# .dev.vars
RAPIDAPI_KEY=your-actual-rapidapi-key
OPENROUTER_API_KEY=your-actual-openrouter-key
```

3. **`.dev.vars`は自動的に`.gitignore`に含まれています**

### Cloudflare Workers (本番環境)

Wrangler CLIを使ってシークレットを設定:

```bash
# RapidAPI キーを設定
wrangler secret put RAPIDAPI_KEY
# プロンプトが表示されたら、キーを入力

# OpenRouter APIキー (1つ目) を設定
wrangler secret put OPENROUTER_API_KEY
# プロンプトが表示されたら、キーを入力

# OpenRouter APIキー (2つ目 - オプション) を設定
# ※1つ目のAPIキーがレート制限または上限に達した場合、自動的に2つ目にフォールバックします
wrangler secret put OPENROUTER_API_KEY_2
# プロンプトが表示されたら、2つ目のキーを入力
```

これらのシークレットは暗号化されて保存され、コードには含まれません。

**Note:** `OPENROUTER_API_KEY_2` はオプショナルです。設定することで、1つ目のAPIキーが以下の状態になった時に自動的にフォールバックします:
- レート制限 (429エラー)
- フリークレジット上限 (402エラー)

### Cloudflare Pages (本番環境)

1. [Cloudflare Dashboard](https://dash.cloudflare.com)にログイン
2. **Pages** → プロジェクトを選択
3. **Settings** → **Functions**
4. **Environment variables**で変数を追加
5. **Encrypt**にチェックを入れる

## 🔍 コミット前のチェック

コミット前に必ず以下を確認してください:

```bash
# APIキーが含まれていないか検索
git diff | grep -E "(sk-or-v1|RAPIDAPI_KEY.*=.*[a-zA-Z0-9]{20})"
```

もし見つかった場合は、**絶対にコミットしないでください！**

## 🚨 APIキーが流出してしまった場合

### 即座に行うべきこと

1. **APIキーを無効化**
   - OpenRouter: https://openrouter.ai/keys
   - RapidAPI: https://rapidapi.com/developer/security

2. **新しいAPIキーを生成**

3. **新しいキーで環境を更新**
   ```bash
   # Workers
   wrangler secret put OPENROUTER_API_KEY
   wrangler secret put RAPIDAPI_KEY
   
   # Pages (Dashboard経由)
   ```

4. **Gitの履歴から削除** (高度な操作 - 注意が必要)
   ```bash
   # 特定のファイルを履歴から完全に削除
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch PAGES_DEPLOYMENT.md" \
     --prune-empty --tag-name-filter cat -- --all
   
   # 強制プッシュ (チーム開発の場合は要注意)
   git push origin --force --all
   ```

## 📝 ドキュメントでの記載方法

ドキュメント内でAPIキーの例を示す場合は、必ずプレースホルダーを使用:

❌ **悪い例**:
```bash
# 実際のAPIキーを直接記載
OPENROUTER_API_KEY=sk-or-v1-[actual-secret-key-here]
```

✅ **良い例**:
```bash
OPENROUTER_API_KEY=<your-openrouter-api-key-here>
# または
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🔐 追加のセキュリティ対策

### 1. .gitignoreの確認

以下が`.gitignore`に含まれていることを確認:
```
.dev.vars
.env
.env.*
*.key
*.pem
secrets.json
```

### 2. pre-commitフックの設定（オプション）

```bash
# .git/hooks/pre-commit
#!/bin/sh
if git diff --cached | grep -E "(sk-or-v1|[a-f0-9]{32})" ; then
    echo "⚠️ APIキーが含まれている可能性があります!"
    echo "コミットを中止しました。"
    exit 1
fi
```

### 3. GitHub Secretsの使用（CI/CD）

GitHub Actionsを使う場合は、必ずSecretsを使用:
- Settings → Secrets and variables → Actions
- 環境変数として設定し、コードには含めない

## 📚 参考資料

- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

## ⚡ クイックリファレンス

```bash
# ローカル開発
cp .dev.vars.example .dev.vars
# .dev.vars を編集してキーを設定

# Workers本番環境
wrangler secret put RAPIDAPI_KEY
wrangler secret put OPENROUTER_API_KEY

# 確認
wrangler secret list

# Pages本番環境
# Cloudflare Dashboardで設定
```

**覚えておいてください**: コードはパブリックになる可能性があります。
シークレット情報は常に外部管理してください！

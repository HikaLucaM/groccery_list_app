# テストガイド

このドキュメントでは、プロジェクトのテスト戦略、テストの書き方、実行方法について説明します。

## 📋 目次

1. [テストフレームワーク](#テストフレームワーク)
2. [テストの実行](#テストの実行)
3. [テスト構成](#テスト構成)
4. [新しいテストの追加](#新しいテストの追加)
5. [CI/CD統合](#cicd統合)

## テストフレームワーク

このプロジェクトでは以下のテストツールを使用しています：

- **[Vitest](https://vitest.dev/)**: 高速で軽量なテストフレームワーク
- **[JSDOM](https://github.com/jsdom/jsdom)**: フロントエンドロジックのテスト用DOM環境
- **[@cloudflare/workers-types](https://www.npmjs.com/package/@cloudflare/workers-types)**: Cloudflare Workers型定義

## テストの実行

### すべてのテストを実行

```bash
npm test
```

### ウォッチモードで実行

コードの変更を検知して自動的にテストを再実行します：

```bash
npm run test:watch
```

### カバレッジレポートを生成

```bash
npm run test:coverage
```

カバレッジレポートは以下の形式で出力されます：
- **テキスト**: ターミナルに表示
- **JSON**: `coverage/coverage-final.json`
- **HTML**: `coverage/index.html`（ブラウザで詳細確認可能）

### 特定のテストファイルのみ実行

```bash
npx vitest test/worker.test.js
npx vitest test/frontend.test.js
```

## テスト構成

### ディレクトリ構造

```
test/
├── worker.test.js      # バックエンドAPI（Cloudflare Worker）のテスト
└── frontend.test.js    # フロントエンドヘルパー関数のテスト
```

### バックエンドテスト（worker.test.js）

#### モックKVストア

テストではCloudflare KVストアをモックする`MockKVNamespace`クラスを使用します：

```javascript
class MockKVNamespace {
  constructor() {
    this.data = new Map();
  }

  async get(key, type = 'text') {
    return this.data.get(key) || null;
  }

  async put(key, value) {
    this.data.set(key, value);
  }

  async delete(key) {
    this.data.delete(key);
  }
}
```

#### テストカテゴリ

1. **CORS処理**
   - OPTIONSプリフライトリクエスト
   - CORSヘッダーの検証

2. **トークンバリデーション**
   - 有効なトークン形式（16文字以上、英数字・ハイフン・アンダースコア）
   - 無効なトークンの拒否

3. **GET /api/list/:token**
   - 新規リストのデフォルト値返却
   - 既存リストの取得
   - 不正データの正規化

4. **PUT /api/list/:token**
   - 新規リスト作成
   - データバリデーション（必須フィールド、型チェック）
   - 位置の正規化
   - タグのフィルタリング
   - タイムスタンプのデフォルト値設定

5. **同時編集マージ**
   - 複数ユーザーの新規アイテム追加
   - `updated_at`ベースの競合解決
   - 削除の処理
   - ペイロードに含まれないアイテムの保持

6. **バージョン管理**
   - 更新ごとのバージョンインクリメント
   - タイムスタンプの更新

7. **DELETE /api/list/:token**
   - リストの削除
   - 削除後のデフォルト値返却

#### テスト例

```javascript
describe('Concurrent Edit Merging', () => {
  it('should merge new items from both users', async () => {
    // User A creates initial list
    const initialData = {
      title: 'Shared List',
      items: [
        { id: 'item-a', label: 'Item A', checked: false, tags: [], pos: 0, updated_at: 1000 }
      ],
      baseVersion: 0,
      deletedItemIds: [],
    };

    await worker.fetch(createRequest('PUT', '/api/list/token', initialData), env);

    // User B adds Item B
    const userBData = {
      title: 'Shared List',
      items: [
        { id: 'item-a', label: 'Item A', checked: false, tags: [], pos: 0, updated_at: 1000 },
        { id: 'item-b', label: 'Item B', checked: false, tags: [], pos: 1, updated_at: 2000 }
      ],
      baseVersion: 1,
      deletedItemIds: [],
    };

    const response = await worker.fetch(createRequest('PUT', '/api/list/token', userBData), env);
    const data = await response.json();

    expect(data.items).toHaveLength(2);
  });
});
```

### フロントエンドテスト（frontend.test.js）

#### テストカテゴリ

1. **normalizeListData関数**
   - null/undefinedの処理
   - デフォルト値の設定
   - 無効なアイテムのフィルタリング
   - タグのバリデーション
   - 位置の正規化
   - タイムスタンプの処理
   - バージョン管理

2. **generateToken関数**
   - トークン長の検証
   - URL安全な文字のみ使用
   - トークンの一意性
   - 暗号学的ランダム性

#### テスト例

```javascript
describe('normalizeListData', () => {
  it('should filter out items without valid id', () => {
    const input = {
      title: 'Test',
      items: [
        { id: 'valid-1', label: 'Valid Item', checked: false },
        { label: 'Missing ID', checked: false },
        { id: '', label: 'Empty ID', checked: false },
      ],
    };

    const result = normalizeListData(input);
    
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('valid-1');
  });
});
```

## 新しいテストの追加

### 1. テストファイルの作成

新しい機能のテストを追加する場合：

```bash
# 新しいテストファイルを作成
touch test/new-feature.test.js
```

### 2. テスト構造

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('New Feature', () => {
  beforeEach(() => {
    // 各テスト前のセットアップ
  });

  describe('Specific Functionality', () => {
    it('should do something correctly', () => {
      // テストの実装
      expect(actual).toBe(expected);
    });

    it('should handle edge cases', () => {
      // エッジケースのテスト
      expect(result).toBeDefined();
    });
  });
});
```

### 3. モックとスタブ

必要に応じてモックを作成：

```javascript
import { vi } from 'vitest';

// 関数のモック
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');

// グローバルオブジェクトのモック
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'mocked' }),
  })
);
```

### 4. 非同期テストのベストプラクティス

```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// またはPromiseの解決を待つ
it('should resolve promise', () => {
  return asyncFunction().then(result => {
    expect(result).toBe('expected');
  });
});
```

## CI/CD統合

### GitHub Actions ワークフロー

#### CI Tests（ci.yml）

プルリクエストとプッシュ時に実行：

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

#### Deploy（deploy.yml）

デプロイ前にテストを実行：

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
  
  deploy:
    needs: test  # テスト成功後のみデプロイ
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
```

### ローカルでCIをシミュレート

```bash
# 依存関係のクリーンインストール（CIと同じ）
npm ci

# テストを実行
npm test

# デプロイのドライラン
npx wrangler deploy --dry-run
```

## テストのベストプラクティス

### ✅ すべきこと

- **明確なテスト名**: テストが何を検証するか一目でわかるように
- **1テスト1アサーション**: 可能な限り1つのテストで1つのことを検証
- **独立したテスト**: テスト間の依存関係を避ける
- **エッジケースのカバー**: 正常系だけでなく異常系もテスト
- **モックの活用**: 外部依存を排除して高速化

### ❌ 避けるべきこと

- **テスト間の状態共有**: 各テストは独立して実行可能に
- **ハードコードされた値**: 定数を使用して保守性を向上
- **不安定なテスト**: ランダムな失敗を避ける
- **過度なモック**: 実際の動作から離れすぎない

## カバレッジ目標

現在のカバレッジと目標：

| カテゴリ | 現在 | 目標 |
|---------|------|------|
| API（Worker） | 27テスト | 30テスト以上 |
| フロントエンド | 19テスト | 25テスト以上 |
| ライン カバレッジ | - | 80%以上 |
| 分岐 カバレッジ | - | 75%以上 |

## トラブルシューティング

### テストが失敗する

1. **依存関係を再インストール**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **キャッシュをクリア**:
   ```bash
   npx vitest run --no-cache
   ```

3. **詳細なエラー情報を表示**:
   ```bash
   npx vitest run --reporter=verbose
   ```

### カバレッジが表示されない

1. **v8プロバイダーがインストールされているか確認**:
   ```bash
   npm install --save-dev @vitest/coverage-v8
   ```

2. **vitest.config.jsの設定を確認**:
   ```javascript
   export default defineConfig({
     test: {
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
       },
     },
   });
   ```

## 参考資料

- [Vitest公式ドキュメント](https://vitest.dev/)
- [Cloudflare Workers テスティング](https://developers.cloudflare.com/workers/testing/)
- [JavaScript テストベストプラクティス](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

質問や提案がある場合は、[Issues](https://github.com/HikaLucaM/groccery_list_app/issues)を開いてください。

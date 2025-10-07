# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **タグ機能**: アイテムにタグを付けて分類・フィルタリング可能に
  - プリセットタグ7種類（Woolies、Coles、ALDI、IGA、Asian Grocery、Chemist、Kmart）
  - カスタムタグ追加機能（「+タグ」ボタンから追加可能）
  - タグごとに固定色のカラーバッジ表示（カスタムタグはグレー）
  - タグフィルタリング機能（チェック状態フィルタとAND条件で併用可能）
  - カスタムタグはlocalStorageに保存され、次回アクセス時も利用可能
  - 各アイテムは1タグまで設定可能（配列形式で拡張性を確保）
- **自動更新機能（ポーリング）**: 7秒間隔で自動的にサーバーからデータを取得し、他のユーザーの変更をリアルタイムで反映
  - 差分検知により不要な再描画を防止
  - 保存中はポーリングをスキップして競合を回避
  - ネットワークエラー時は自動リトライ
  - 同期中の視覚的インジケーター（緑の点滅）を表示
- **モバイル最適化UI**:
  - チェックボックスを右側に配置（片手操作で親指でタップしやすい）
  - 下部固定の入力バー（スクロールせずにすぐアクセス可能）
  - タップ領域を拡大（最小44px高さ）
  - 長いテキストの自動折り返し対応
  - レスポンシブデザイン（モバイル・タブレット・デスクトップ対応）
  - iOS向けフォントサイズ16px（ズーム防止）
  - セーフエリア対応（iPhone等のホームインジケーターと重ならない）
- ヘッダーをsticky化（スクロールしても共有URLとフィルターが常に表示）
- アクセシビリティ向上（aria-label追加、キーボード操作対応）
- カスタムタグ追加用モーダルダイアログ

### Changed
- UIレイアウトを全面的にモバイルファーストで再設計
- アイテムの最小高さを60pxに拡大（タップしやすさ向上）
- 入力フィールドとボタンの高さを48pxに統一
- 共有URLコピーボタンのラベルを「コピー」→「✓ 完了」に変更（コピー成功時）
- トースト通知の位置を下部入力バーと重ならないように調整
- チェックボックスのサイズを22pxに調整
- 削除ボタンを削除（チェックで自動的に非表示になるため不要）
- フィルターセクションを2行レイアウトに変更（チェック状態フィルタとタグフィルタ）
- 入力バーを2行レイアウトに変更（アイテム入力とタグ選択を分離）

### Fixed
- Enterキー押下時の意図しないフォーム送信を防止
- 楽観的UI更新により、保存中でも即座に画面が更新される
- タグフィルタ選択肢が動的に更新される（使用中のタグのみ表示）

## [0.2.0] - 2025-10-07

### Added
- ワンクリックURLコピー機能
- GitHub Actions CI/CD パイプライン（mainブランチへのpushで自動デプロイ）
- CICD_SETUP.md（CI/CD設定ガイド）

### Changed
- README.mdを全面的に刷新（デモリンク、バッジ、詳細な手順を追加）

## [0.1.0] - 2025-10-07

### Added
- 初回リリース
- Cloudflare Workers + KV バックエンド
- 静的HTML/CSS/JSフロントエンド
- トークンベースの共有機能（認証不要）
- 基本的なCRUD操作（追加、チェック、削除）
- フィルター機能（未チェックのみ/すべて）
- 自動ソート（未チェック優先）
- MIT ライセンス

[Unreleased]: https://github.com/HikaLucaM/groccery_list_app/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/HikaLucaM/groccery_list_app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/HikaLucaM/groccery_list_app/releases/tag/v0.1.0

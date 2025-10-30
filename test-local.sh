#!/bin/bash

# ローカル開発用テストスクリプト
# wrangler dev が実行中である必要があります

BASE_URL="http://localhost:8787"
echo "🚀 Testing against: $BASE_URL"
echo ""

# Test 1: 特売情報取得
echo "📊 Test 1: 特売情報取得"
curl -s "$BASE_URL/api/specials" | jq '.status, .count, (.specials[0:2] | map({name, price, store}))'
echo ""

# Test 2: 商品検索
echo "🔍 Test 2: 商品検索 (beef)"
curl -s "$BASE_URL/api/search?q=beef" | jq '.status, .count, (.results[0:2] | map({name, price, store}))'
echo ""

# Test 3: AIマッチング
echo "🤖 Test 3: AIマッチング"
curl -s -X POST "$BASE_URL/api/ai-match" \
  -H "Content-Type: application/json" \
  -d '{"items": ["牛肉", "牛乳", "パン"]}' \
  | jq '.status, .catalogSize, .totalSavings, (.matches[0] | {userInput, bestMatch: .bestMatch.name})'
echo ""

# Test 4: AI生成(特売込み)
echo "✨ Test 4: AI生成 (特売込み)"
curl -s -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "週末のバーベキュー", "token": "test1234567890abc", "useSpecials": true}' \
  | jq '.status, .specialsUsed, .specialsCount, .pricesIncluded, (.suggestions[0:3] | map({label, price, store}))'
echo ""

echo "✅ テスト完了!"

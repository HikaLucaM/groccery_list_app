#!/bin/bash

# RapidAPI統合テストスクリpt
# ローカルサーバー (http://localhost:8787) が起動している必要があります

set -e

BASE_URL="http://localhost:8787"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 RapidAPI Integration Test Script"
echo "===================================="
echo ""

# Check if server is running
echo -n "Checking if local server is running... "
if curl -s -f -o /dev/null "$BASE_URL/"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo ""
  echo "❌ Local server is not running!"
  echo "Please start it with: npm run dev"
  exit 1
fi

echo ""
echo "📊 Test 1: Get specials from RapidAPI"
echo "--------------------------------------"
echo "GET $BASE_URL/api/specials-rapidapi"
echo ""

SPECIALS_RESPONSE=$(curl -s "$BASE_URL/api/specials-rapidapi")
SPECIALS_COUNT=$(echo "$SPECIALS_RESPONSE" | jq -r '.count // 0')
SPECIALS_SOURCE=$(echo "$SPECIALS_RESPONSE" | jq -r '.source // "unknown"')

if [ "$SPECIALS_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Success!${NC}"
  echo "Found $SPECIALS_COUNT specials from $SPECIALS_SOURCE"
  echo ""
  echo "Sample (first 3 items):"
  echo "$SPECIALS_RESPONSE" | jq '.specials[0:3]'
else
  echo -e "${YELLOW}⚠ No specials found${NC}"
  echo "Response:"
  echo "$SPECIALS_RESPONSE" | jq '.'
fi

echo ""
echo "🔍 Test 2: Search for 'milk' using RapidAPI"
echo "--------------------------------------------"
echo "GET $BASE_URL/api/search-rapidapi?q=milk"
echo ""

SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/search-rapidapi?q=milk")
SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.count // 0')

if [ "$SEARCH_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Success!${NC}"
  echo "Found $SEARCH_COUNT results"
  echo ""
  echo "Sample (first 3 results):"
  echo "$SEARCH_RESPONSE" | jq '.results[0:3]'
else
  echo -e "${YELLOW}⚠ No results found${NC}"
  echo "Response:"
  echo "$SEARCH_RESPONSE" | jq '.'
fi

echo ""
echo "🤖 Test 3: AI Matching with RapidAPI catalog"
echo "---------------------------------------------"
echo "POST $BASE_URL/api/ai-match-rapidapi"
echo ""

AI_MATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai-match-rapidapi" \
  -H "Content-Type: application/json" \
  -d '{"items": ["牛肉", "牛乳", "パン"]}')

AI_CATALOG_SIZE=$(echo "$AI_MATCH_RESPONSE" | jq -r '.catalogSize // 0')
AI_SAVINGS=$(echo "$AI_MATCH_RESPONSE" | jq -r '.totalSavings // 0')

if [ "$AI_CATALOG_SIZE" -gt 0 ]; then
  echo -e "${GREEN}✓ Success!${NC}"
  echo "Catalog size: $AI_CATALOG_SIZE items"
  echo "Total potential savings: \$$AI_SAVINGS"
  echo ""
  echo "Matches:"
  echo "$AI_MATCH_RESPONSE" | jq '.matches'
else
  echo -e "${YELLOW}⚠ AI matching failed or returned no results${NC}"
  echo "Response:"
  echo "$AI_MATCH_RESPONSE" | jq '.'
fi

echo ""
echo "📈 Test 4: Compare Mock vs RapidAPI"
echo "------------------------------------"

MOCK_SPECIALS=$(curl -s "$BASE_URL/api/specials")
MOCK_COUNT=$(echo "$MOCK_SPECIALS" | jq -r '.count // 0')

echo "Mock data specials: $MOCK_COUNT"
echo "RapidAPI specials: $SPECIALS_COUNT"

if [ "$SPECIALS_COUNT" -gt "$MOCK_COUNT" ]; then
  echo -e "${GREEN}✓ RapidAPI has more data!${NC}"
elif [ "$MOCK_COUNT" -gt 0 ] && [ "$SPECIALS_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠ RapidAPI returned no data, falling back to mock${NC}"
else
  echo -e "${GREEN}✓ Both sources working${NC}"
fi

echo ""
echo "✅ All tests completed!"
echo ""
echo "💡 Tips:"
echo "  - If RapidAPI tests fail, check:"
echo "    1. .dev.vars file has valid RAPIDAPI_KEY"
echo "    2. RapidAPI subscription is active"
echo "    3. Rate limits not exceeded"
echo ""
echo "  - Mock endpoints are still available:"
echo "    • GET /api/specials (mock)"
echo "    • GET /api/search?q=... (mock)"
echo "    • POST /api/ai-match (mock)"

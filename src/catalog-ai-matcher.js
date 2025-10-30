/**
 * AI-Powered Catalog Matching
 * 
 * ユーザー入力とカタログ商品の間の曖昧マッチングをAIで実現:
 * - 「牛肉」→「Australian Beef Mince」「Beef Scotch Fillet」
 * - 「牛乳」→「Full Cream Milk」「Almond Milk」
 * - 「パン」→「White Bread」「Sourdough Bread」
 * 
 * アプローチ:
 * 1. 全カタログをKVに保存
 * 2. ユーザー入力を受け取る
 * 3. LLMで類似商品を検索・マッチング
 */

/**
 * Build searchable catalog text for AI
 */
function buildCatalogPrompt(catalogItems) {
  if (!catalogItems || catalogItems.length === 0) {
    return 'カタログが空です。';
  }
  
  let prompt = '以下は現在の商品カタログです:\n\n';
  
  catalogItems.forEach((item, index) => {
    const specialMark = item.onSpecial ? '🔥特売🔥' : '';
    const priceInfo = item.wasPrice 
      ? `$${item.price} (通常$${item.wasPrice}) ${specialMark}`
      : `$${item.price}`;
    
    prompt += `${index + 1}. ${item.name} - ${priceInfo} [${item.store}]\n`;
    if (item.brand) prompt += `   ブランド: ${item.brand}\n`;
    if (item.size) prompt += `   サイズ: ${item.size}\n`;
  });
  
  return prompt;
}

/**
 * Match user items with catalog using AI
 * 
 * @param {Array} userItems - ユーザーのショッピングリストアイテム ['牛肉', '牛乳', 'パン']
 * @param {Array} catalogItems - カタログ商品リスト
 * @param {string|Array} apiKey - OpenRouter API Key (string or array of keys for fallback)
 * @returns {Promise<Array>} - マッチング結果
 */
export async function matchItemsWithAI(userItems, catalogItems, apiKey) {
  if (!userItems || userItems.length === 0) {
    return [];
  }
  
  if (!catalogItems || catalogItems.length === 0) {
    console.warn('Catalog is empty, cannot match items');
    return userItems.map(item => ({
      userInput: item,
      matches: [],
      bestMatch: null,
    }));
  }
  
  // Support both single key and array of keys
  const apiKeys = Array.isArray(apiKey) ? apiKey : [apiKey];
  
  const catalogPrompt = buildCatalogPrompt(catalogItems);
  
  const userItemsList = userItems.map((item, i) => `${i + 1}. ${item}`).join('\n');
  
  const prompt = `${catalogPrompt}

【タスク】
上記のカタログから、以下のユーザーの買い物リストに最も適した商品を見つけてください。
各アイテムについて、カタログ番号(複数可)と理由を返してください。
特売商品を優先してください。

【ユーザーの買い物リスト】
${userItemsList}

【出力フォーマット】(JSON only)
{
  "matches": [
    {
      "userItem": "ユーザー入力",
      "catalogNumbers": [1, 2],
      "reason": "マッチング理由"
    }
  ]
}`;

  // Try each API key
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const currentKey = apiKeys[keyIndex];
    console.log(`AI matching: trying API key ${keyIndex + 1}/${apiKeys.length}`);
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://shared-shopping-list.grocery-shopping-list.workers.dev',
          'X-Title': 'Shared Shopping List - AI Matcher',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          temperature: 0.3,
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt + '\n\nIMPORTANT: You MUST respond with ONLY valid JSON. Do not include any explanations, markdown, or text outside the JSON object.'
            },
          ],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
          console.error('No content in AI response');
          continue;
        }
        
        // Parse AI response
        const parsed = JSON.parse(content);
        
        // Map catalog numbers to actual products
        const results = parsed.matches.map(match => {
          const matchedProducts = match.catalogNumbers
            .map(num => catalogItems[num - 1]) // 1-indexed to 0-indexed
            .filter(Boolean);
          
          return {
            userInput: match.userItem,
            matches: matchedProducts,
            bestMatch: matchedProducts[0] || null,
            reason: match.reason,
          };
        });
        
        console.log(`✓ AI matching succeeded with key ${keyIndex + 1}`);
        return results;
        
      } else {
        // Try next key on rate limit or payment required
        if ((response.status === 429 || response.status === 402) && keyIndex + 1 < apiKeys.length) {
          console.log(`API key ${keyIndex + 1} failed with status ${response.status}, trying next key...`);
          continue;
        }
        
        console.error('AI matching API failed:', response.status);
        if (keyIndex + 1 >= apiKeys.length) {
          // Last key failed, return empty results
          return userItems.map(item => ({
            userInput: item,
            matches: [],
            bestMatch: null,
          }));
        }
      }
      
    } catch (error) {
      console.error(`Error with API key ${keyIndex + 1}:`, error);
      
      // Try next key if available
      if (keyIndex + 1 < apiKeys.length) {
        continue;
      }
      
      // Last key, return error results
      return userItems.map(item => ({
        userInput: item,
        matches: [],
        bestMatch: null,
        error: error.message,
      }));
    }
  }
  
  // All keys failed
  return userItems.map(item => ({
    userInput: item,
    matches: [],
    bestMatch: null,
  }));
}

/**
 * Simple keyword-based fallback matching
 * Used when AI matching fails
 */
export function simpleKeywordMatch(userInput, catalogItems) {
  const query = userInput.toLowerCase();
  const matches = [];
  
  // Keyword mappings (Japanese → English)
  const keywords = {
    '牛肉': ['beef', 'mince', 'scotch', 'steak'],
    '豚肉': ['pork', 'bacon', 'ham'],
    '鶏肉': ['chicken', 'breast', 'thigh'],
    '魚': ['fish', 'salmon', 'tuna', 'prawn'],
    '牛乳': ['milk', 'dairy'],
    'パン': ['bread', 'loaf'],
    '卵': ['egg'],
    'チーズ': ['cheese'],
    'バター': ['butter'],
    'ヨーグルト': ['yogurt', 'yoghurt'],
    '野菜': ['vegetable', 'tomato', 'carrot', 'potato', 'onion', 'broccoli'],
    'トマト': ['tomato'],
    'にんじん': ['carrot'],
    'じゃがいも': ['potato'],
    '玉ねぎ': ['onion'],
  };
  
  // Direct keyword match
  for (const [japanese, englishTerms] of Object.entries(keywords)) {
    if (query.includes(japanese)) {
      for (const item of catalogItems) {
        const itemName = item.name.toLowerCase();
        if (englishTerms.some(term => itemName.includes(term))) {
          matches.push(item);
        }
      }
    }
  }
  
  // English direct match
  for (const item of catalogItems) {
    const itemName = item.name.toLowerCase();
    if (itemName.includes(query) || query.includes(itemName)) {
      matches.push(item);
    }
  }
  
  // Remove duplicates
  const uniqueMatches = Array.from(new Map(matches.map(m => [m.name, m])).values());
  
  // Sort by: specials first, then by price
  return uniqueMatches.sort((a, b) => {
    if (a.onSpecial && !b.onSpecial) return -1;
    if (!a.onSpecial && b.onSpecial) return 1;
    return a.price - b.price;
  });
}

/**
 * Hybrid matching: Try AI first, fallback to keyword
 */
export async function hybridMatch(userItems, catalogItems, apiKey) {
  try {
    // Try AI matching first
    const aiResults = await matchItemsWithAI(userItems, catalogItems, apiKey);
    
    // Check if AI matching succeeded
    const hasValidMatches = aiResults.some(r => r.matches && r.matches.length > 0);
    
    if (hasValidMatches) {
      console.log('AI matching succeeded');
      return aiResults;
    }
    
    console.log('AI matching failed, using keyword fallback');
    
    // Fallback to keyword matching
    return userItems.map(userItem => {
      const matches = simpleKeywordMatch(userItem, catalogItems);
      return {
        userInput: userItem,
        matches: matches,
        bestMatch: matches[0] || null,
        method: 'keyword',
      };
    });
    
  } catch (error) {
    console.error('Hybrid match error:', error);
    
    // Emergency fallback
    return userItems.map(userItem => {
      const matches = simpleKeywordMatch(userItem, catalogItems);
      return {
        userInput: userItem,
        matches: matches,
        bestMatch: matches[0] || null,
        method: 'keyword-emergency',
        error: error.message,
      };
    });
  }
}

/**
 * Enhance AI-generated shopping list with catalog prices
 * 
 * AIが生成したリスト → カタログで価格検索 → 価格情報を追加
 */
export async function enhanceWithCatalogPrices(aiGeneratedItems, catalogItems, apiKey) {
  const itemLabels = aiGeneratedItems.map(item => item.label);
  
  const matchResults = await hybridMatch(itemLabels, catalogItems, apiKey);
  
  // Enhance items with catalog info
  return aiGeneratedItems.map((item, index) => {
    const matchResult = matchResults[index];
    
    if (matchResult && matchResult.bestMatch) {
      return {
        ...item,
        catalogMatch: matchResult.bestMatch,
        price: matchResult.bestMatch.price,
        wasPrice: matchResult.bestMatch.wasPrice,
        onSpecial: matchResult.bestMatch.onSpecial,
        store: matchResult.bestMatch.store,
        savings: matchResult.bestMatch.wasPrice 
          ? (matchResult.bestMatch.wasPrice - matchResult.bestMatch.price)
          : 0,
      };
    }
    
    return item;
  });
}

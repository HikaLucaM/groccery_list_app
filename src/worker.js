/**
 * Cloudflare Worker for Shared Shopping List API
 * 
 * NEW FEATURE: AI Shopping Concierge
 * ===================================
 * 
 * Endpoint: POST /api/generate
 * 
 * This endpoint allows users to generate shopping lists from natural language prompts
 * using AI (OpenRouter API with Llama 3 70B by default).
 * 
 * Testing Instructions:
 * ---------------------
 * 1. Set up the OpenRouter API key:
 *    wrangler secret put OPENROUTER_API_KEY
 * 
 * 2. (Optional) Set a different model:
 *    wrangler secret put MODEL
 *    Default: meta-llama/llama-3-70b-instruct
 * 
 * 3. Run locally:
 *    wrangler dev
 * 
 * 4. Open in browser:
 *    http://127.0.0.1:8787/?t=<your_token>
 *    (Use any alphanumeric token 16+ chars, e.g., "test1234567890abc")
 * 
 * 5. Click the "🤖 AI" button in the bottom bar
 * 
 * 6. Enter a prompt like:
 *    - "平日5日分の夕食の買い物リスト"
 *    - "週末のバーベキューに必要なもの"
 *    - "一人暮らしの基本的な食材"
 * 
 * 7. The list will be generated and automatically saved to KV
 * 
 * Request format:
 * POST /api/generate
 * {
 *   "prompt": "平日5日分の夕食の買い物リスト",
 *   "token": "your-list-token-here"
 * }
 * 
 * Response format (success):
 * {
 *   "status": "success",
 *   "items": [
 *     {
 *       "id": "uuid",
 *       "label": "牛肉",
 *       "tags": ["Woolies"],
 *       "checked": false,
 *       "pos": 0,
 *       "updated_at": 1234567890
 *     },
 *     ...
 *   ]
 * }
 */

// Import catalog API modules
import { 
  getAllSpecials, 
  formatSpecialsForAI, 
  searchProduct,
  matchItemsWithCatalog 
} from './catalog-api.js';

// Import RapidAPI module (official APIs)
import {
  getAllSpecialsRapidAPI,
  searchProductRapidAPI,
  formatRapidAPISpecialsForAI
} from './catalog-rapidapi.js';

// Import AI matcher
import {
  hybridMatch,
  enhanceWithCatalogPrices,
  simpleKeywordMatch
} from './catalog-ai-matcher.js';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// Token validation: alphanumeric, underscore, hyphen, min 16 chars
const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Serve index.html for root path
    if (url.pathname === '/' || url.pathname === '/index.html') {
      try {
        const asset = await env.ASSETS.fetch(new URL('/index.html', request.url));
        return new Response(asset.body, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            // Disable caching to ensure latest UI assets are served after deploys
            'Cache-Control': 'no-store',
          },
        });
      } catch (error) {
        console.error('Error serving index.html:', error);
        return new Response('App not found', { status: 404 });
      }
    }

    // Parse path: /api/generate
    if (url.pathname === '/api/generate' && method === 'POST') {
      return await handleGenerate(request, env);
    }

    // Parse path: /api/specials (Get current specials from Woolworths & Coles - Mock data)
    if (url.pathname === '/api/specials' && method === 'GET') {
      return await handleGetSpecials(request, env);
    }

    // Parse path: /api/specials-rapidapi (Get specials from RapidAPI)
    if (url.pathname === '/api/specials-rapidapi' && method === 'GET') {
      return await handleGetSpecialsRapidAPI(request, env);
    }

    // Parse path: /api/search (Search for a product - Mock data)
    if (url.pathname === '/api/search' && method === 'GET') {
      return await handleSearchProduct(request, env);
    }

    // Parse path: /api/search-rapidapi (Search using RapidAPI)
    if (url.pathname === '/api/search-rapidapi' && method === 'GET') {
      return await handleSearchProductRapidAPI(request, env);
    }

    // Parse path: /api/match (Match list items with catalog)
    if (url.pathname === '/api/match' && method === 'POST') {
      return await handleMatchItems(request, env);
    }

    // Parse path: /api/ai-match (AI-powered matching - Mock data)
    if (url.pathname === '/api/ai-match' && method === 'POST') {
      return await handleAIMatch(request, env);
    }

    // Parse path: /api/ai-match-rapidapi (AI matching with RapidAPI)
    if (url.pathname === '/api/ai-match-rapidapi' && method === 'POST') {
      return await handleAIMatchRapidAPI(request, env);
    }

    // Parse path: /api/filter-specials (Filter specials by user's list using AI)
    if (url.pathname === '/api/filter-specials' && method === 'POST') {
      return await handleFilterSpecials(request, env);
    }

    // Parse path: /api/clear-cache (Clear RapidAPI cache - for development)
    if (url.pathname === '/api/clear-cache' && method === 'POST') {
      try {
        await env.SHOPLIST.delete('catalog:specials:rapidapi');
        return jsonResponse({ status: 'success', message: 'Cache cleared' });
      } catch (error) {
        return jsonResponse({ error: 'Failed to clear cache' }, 500);
      }
    }

    // Parse path: /api/list/:token
    const pathMatch = url.pathname.match(/^\/api\/list\/([^/]+)$/);
    if (!pathMatch) {
      return jsonResponse({ error: 'Invalid path' }, 404);
    }

    const token = pathMatch[1];

    // Validate token format
    if (!TOKEN_PATTERN.test(token)) {
      return jsonResponse({ error: 'Invalid token format' }, 400);
    }

    const kvKey = `list:${token}`;

    try {
      switch (method) {
        case 'GET':
          return await handleGet(env.SHOPLIST, kvKey);
        case 'PUT':
          return await handlePut(request, env.SHOPLIST, kvKey);
        case 'DELETE':
          return await handleDelete(env.SHOPLIST, kvKey);
        default:
          return jsonResponse({ error: 'Method not allowed' }, 405);
      }
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};

/**
 * GET /api/list/:token
 * Returns the list document or default empty list
 */
async function handleGet(kv, kvKey) {
  const stored = await kv.get(kvKey, 'text');

  if (!stored) {
    return jsonResponse(createDefaultDocument());
  }

  const doc = JSON.parse(stored);
  if (!Array.isArray(doc.items)) {
    doc.items = [];
  }
  if (typeof doc.version !== 'number') {
    doc.version = 0;
  }

  return jsonResponse(doc);
}

/**
 * PUT /api/list/:token
 * Updates the list document with validation and pos renumbering
 */
async function handlePut(request, kv, kvKey) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // Validate structure
  if (!body || typeof body.title !== 'string' || !Array.isArray(body.items)) {
    return jsonResponse({ error: 'Invalid document structure' }, 400);
  }

  const deletedItemIds = Array.isArray(body.deletedItemIds)
    ? body.deletedItemIds.filter((id) => typeof id === 'string' && id.length > 0)
    : [];

  const incomingItems = new Map();
  try {
    body.items.forEach((item, index) => {
      const normalized = normalizeItem(item, index);
      incomingItems.set(normalized.id, normalized);
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Invalid item data' }, 400);
  }

  const stored = await kv.get(kvKey, 'text');
  const existingDoc = stored ? JSON.parse(stored) : createDefaultDocument();
  if (!Array.isArray(existingDoc.items)) {
    existingDoc.items = [];
  }
  if (typeof existingDoc.version !== 'number') {
    existingDoc.version = 0;
  }

  const existingItems = new Map();
  try {
    existingDoc.items.forEach((item, index) => {
      const normalized = normalizeItem(item, index);
      existingItems.set(normalized.id, normalized);
    });
  } catch (error) {
    // If existing data is corrupted, start fresh
    console.error('Error normalizing existing items:', error);
  }

  const deletedSet = new Set(deletedItemIds);
  const mergedItems = [];
  const processedIds = new Set();

  // Resolve items present in incoming payload
  for (const [id, incomingItem] of incomingItems.entries()) {
    if (deletedSet.has(id)) {
      processedIds.add(id);
      continue;
    }

    const existingItem = existingItems.get(id);
    if (existingItem) {
      const incomingUpdatedAt = Number(incomingItem.updated_at) || 0;
      const existingUpdatedAt = Number(existingItem.updated_at) || 0;
      mergedItems.push(incomingUpdatedAt >= existingUpdatedAt ? incomingItem : existingItem);
      processedIds.add(id);
    } else {
      mergedItems.push(incomingItem);
      processedIds.add(id);
    }
  }

  // Preserve items that were not included in this payload and not explicitly deleted
  for (const [id, existingItem] of existingItems.entries()) {
    if (processedIds.has(id)) continue;
    if (deletedSet.has(id)) continue;
    mergedItems.push(existingItem);
  }

  mergedItems.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  mergedItems.forEach((item, index) => {
    item.pos = index;
  });

  const nextVersion = (existingDoc.version || 0) + 1;
  const incomingTitle = typeof body.title === 'string' ? body.title : existingDoc.title || 'Shopping';

  const mergedDoc = {
    title: incomingTitle,
    items: mergedItems,
    version: nextVersion,
    updated_at: Date.now(),
  };

  await kv.put(kvKey, JSON.stringify(mergedDoc));

  return jsonResponse(mergedDoc);
}

/**
 * DELETE /api/list/:token
 * Deletes the list document
 */
async function handleDelete(kv, kvKey) {
  await kv.delete(kvKey);
  return jsonResponse({ ok: true });
}

/**
 * Helper: Create JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function createDefaultDocument() {
  return {
    title: 'Shopping',
    items: [],
    version: 0,
    updated_at: Date.now(),
  };
}

function normalizeItem(item, fallbackPos = 0) {
  if (!item || typeof item !== 'object') {
    throw new Error('Invalid item structure');
  }

  if (typeof item.id !== 'string' || !item.id) {
    throw new Error('Item missing id');
  }

  if (typeof item.label !== 'string') {
    throw new Error('Item missing label');
  }

  if (typeof item.checked !== 'boolean') {
    throw new Error('Item missing checked state');
  }

  const tags = Array.isArray(item.tags)
    ? item.tags.filter((tag) => typeof tag === 'string' && tag.length > 0)
    : [];

  let updatedAt = Number(item.updated_at);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    updatedAt = Date.now();
  }

  const pos = Number.isFinite(item.pos) ? Number(item.pos) : fallbackPos;

  return {
    id: item.id,
    label: item.label,
    checked: item.checked,
    tags,
    pos,
    updated_at: updatedAt,
  };
}

/**
 * Helper: Call OpenRouter API with a specific model
 * Strict JSON enforcement: Updated prompt to guarantee JSON-only output
 */
async function callOpenRouter(model, prompt, apiKey, signal) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://shared-shopping-list.grocery-shopping-list.workers.dev',
      'X-Title': 'Shared Shopping List',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `あなたは買い物リスト作成の専門家です。ユーザーのリクエストに基づいて、必要な食材や商品のリストを作成してください。

ユーザーのリクエスト:
${prompt}

指示:
1. リクエストに最適な食材・商品を具体的にリストアップ
2. 料理名が含まれる場合は、その料理を作るために必要な材料をすべて含める
3. 数量や詳細が指定されていない場合は、一般的な量を想定
4. 各アイテムには適切な店舗タグを1つ付ける(Woolies, Coles, ALDI, IGA, Asian Grocery, Chemist, Kmart)

出力形式(必ずこのJSON形式で):
{"items":[{"label":"商品名(日本語)","tags":["店舗名"],"checked":false}]}

重要: 有効なJSONのみを出力してください。説明文やマークダウンは不要です。`
        },
      ],
    }),
    signal,
  });
  return response;
}

/**
 * Helper: Generate with fallback models
 * free-tier model switch
 */
async function generateWithFallbacks(prompt, env) {
  // free-tier model switch: Default to free model
  const DEFAULT_MODEL = env.MODEL ?? 'deepseek/deepseek-chat-v3.1:free';
  
  // free-tier model switch: Fallback models
  const FALLBACK_MODELS = (env.MODEL_FALLBACKS ?? 'mistralai/mistral-7b-instruct:free,openrouter/auto').split(',');
  
  const models = [DEFAULT_MODEL, ...FALLBACK_MODELS];
  const apiKey = env.OPENROUTER_API_KEY;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    for (const model of models) {
      try {
        console.log('Trying model:', model);
        
        const response = await callOpenRouter(model.trim(), prompt, apiKey, controller.signal);
        
        // Success case
        if (response.status === 200) {
          const data = await response.json();
          return data;
        }
        
        // Payment required → try next model
        if (response.status === 402) {
          console.log(`Model ${model} requires payment, trying next...`);
          continue;
        }
        
        // Rate limit → wait and retry
        if (response.status === 429) {
          console.log(`Rate limited on ${model}, waiting 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // Other errors → try next model
        console.log(`Model ${model} failed with status ${response.status}, trying next...`);
        continue;
        
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError);
        continue;
      }
    }
    
    // All models failed
    throw new Error('All models failed');
    
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper: Safely parse and validate JSON from LLM output
 * Handles markdown code fences, text pollution, and validates schema
 */
function safeJsonParseLLMOutput(text) {
  try {
    // Remove code fences and markdown remnants
    const cleaned = text.replace(/```json|```/g, "").trim();
    
    // Extract first JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found");

    // Parse JSON
    const json = JSON.parse(match[0]);

    // Basic schema validation
    if (!Array.isArray(json.items)) throw new Error("Missing 'items' array");
    
    for (const item of json.items) {
      if (typeof item.label !== "string") throw new Error("Invalid label");
    }

    return json;
  } catch (err) {
    console.error("LLM JSON parse failed:", err);
    return { error: "Invalid JSON", raw: text };
  }
}

/**
 * Helper: Normalize tag to allowed list
 * Tags are restricted to specific stores
 */
const ALLOWED_TAGS = ["Woolies", "Coles", "ALDI", "IGA", "Asian Grocery", "Chemist", "Kmart"];

function getAllowedTag(tag) {
  if (!tag) return "Woolies";
  const found = ALLOWED_TAGS.find(t => tag.toLowerCase().includes(t.toLowerCase()));
  return found || "Woolies";
}

/**
 * Helper: Safely parse and validate list data from AI response
 * Uses safeJsonParseLLMOutput for robust parsing
 */
function safeParseList(text) {
  // Parse with safe JSON extraction
  const parsed = safeJsonParseLLMOutput(text);
  
  // Handle parsing errors
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  
  // Normalize items with allowed tags only
  return parsed.items
    .filter(item => item.label && typeof item.label === 'string')
    .map((item, index) => ({
      id: crypto.randomUUID(),
      label: item.label.trim().slice(0, 64),
      tags: [getAllowedTag(Array.isArray(item.tags) ? item.tags[0] : null)],
      checked: true, // Initial state is checked for preview
      pos: index,
      updated_at: Date.now(),
    }));
}

/**
 * POST /api/generate
 * Generate shopping list using AI (OpenRouter)
 * NOW WITH CATALOG INTEGRATION: AI considers current specials
 */
async function handleGenerate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { prompt, token, useSpecials = false } = body;

  // Validate input
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return jsonResponse({ error: 'Missing or invalid prompt' }, 400);
  }

  if (!token || typeof token !== 'string') {
    return jsonResponse({ error: 'Missing token' }, 400);
  }

  // Validate token format
  if (!TOKEN_PATTERN.test(token)) {
    return jsonResponse({ error: 'Invalid token format' }, 400);
  }

  // Fetch existing list document
  const kvKey = `list:${token}`;
  const stored = await env.SHOPLIST.get(kvKey, 'text');
  const existingDoc = stored ? JSON.parse(stored) : createDefaultDocument();

  // Call OpenRouter API with fallback
  try {
    const apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not configured');
      return jsonResponse({ error: 'AI service not configured' }, 500);
    }

    // NEW: Fetch specials if requested
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    
    let enhancedPrompt = prompt;
    let specialsData = [];
    
    try {
      if (useSpecials) {
        specialsData = await getAllSpecials(env.SHOPLIST, controller.signal);
        const specialsText = formatSpecialsForAI(specialsData);
        enhancedPrompt = `${prompt}\n\n${specialsText}\n\n※上記の特売品を優先的に使用してリストを作成してください。`;
      }
    } catch (specialsError) {
      console.warn('Failed to fetch specials, continuing without:', specialsError);
    }

    // Generate with fallbacks
    const openRouterData = await generateWithFallbacks(enhancedPrompt, env);
    
    clearTimeout(timeoutId);
    
    // Extract content from response
    if (!openRouterData.choices || !openRouterData.choices[0] || !openRouterData.choices[0].message) {
      console.error('Invalid OpenRouter response structure:', openRouterData);
      return jsonResponse({ error: 'Invalid AI response' }, 502);
    }

    const content = openRouterData.choices[0].message.content;

    // Parse and validate
    const normalizedItems = safeParseList(content);

    // NEW: Enhance with catalog prices if specials were used
    let enhancedItems = normalizedItems;
    if (useSpecials && specialsData.length > 0) {
      try {
        enhancedItems = await enhanceWithCatalogPrices(
          normalizedItems, 
          specialsData, 
          apiKey
        );
        console.log('Enhanced items with catalog prices');
      } catch (enhanceError) {
        console.warn('Failed to enhance with catalog:', enhanceError);
        // Continue with original items
      }
    }

    // Return suggestions without saving
    return jsonResponse({
      status: 'ok',
      suggestions: enhancedItems,
      specialsUsed: useSpecials && specialsData.length > 0,
      specialsCount: specialsData.length,
      pricesIncluded: enhancedItems.some(item => item.price !== undefined),
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('OpenRouter API timeout');
      return jsonResponse({ error: 'AI生成がタイムアウトしました' }, 504);
    }
    console.error('Error in handleGenerate:', error);
    return jsonResponse({ 
      error: 'AI生成に失敗しました',
      details: error.message 
    }, 500);
  }
}

/**
 * GET /api/specials
 * Get current specials from Woolworths & Coles
 */
async function handleGetSpecials(request, env) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const specials = await getAllSpecials(env.SHOPLIST, controller.signal);
    
    clearTimeout(timeoutId);
    
    return jsonResponse({
      status: 'success',
      specials,
      count: specials.length,
      cached: true,
    });
  } catch (error) {
    console.error('Error in handleGetSpecials:', error);
    return jsonResponse({ error: 'Failed to fetch specials' }, 500);
  }
}

/**
 * GET /api/search?q=product_name
 * Search for a product across Woolworths & Coles
 */
async function handleSearchProduct(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  
  if (!query || query.trim().length === 0) {
    return jsonResponse({ error: 'Missing search query' }, 400);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const results = await searchProduct(query.trim(), controller.signal);
    
    clearTimeout(timeoutId);
    
    return jsonResponse({
      status: 'success',
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in handleSearchProduct:', error);
    return jsonResponse({ error: 'Search failed' }, 500);
  }
}

/**
 * POST /api/match
 * Match shopping list items with catalog products
 * Body: { items: [...] }
 */
async function handleMatchItems(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  
  const { items } = body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return jsonResponse({ error: 'Invalid or empty items array' }, 400);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const matches = await matchItemsWithCatalog(items, controller.signal);
    
    clearTimeout(timeoutId);
    
    return jsonResponse({
      status: 'success',
      matches,
      totalSavings: calculateTotalSavings(matches),
    });
  } catch (error) {
    console.error('Error in handleMatchItems:', error);
    return jsonResponse({ error: 'Matching failed' }, 500);
  }
}

/**
 * Helper: Calculate total savings from matched items
 */
function calculateTotalSavings(matches) {
  let savings = 0;
  
  for (const match of matches) {
    if (match.catalogMatch && match.catalogMatch.wasPrice && match.catalogMatch.price) {
      savings += (match.catalogMatch.wasPrice - match.catalogMatch.price);
    }
  }
  
  return Math.round(savings * 100) / 100;
}

/**
 * POST /api/ai-match
 * AI-powered matching of user items with catalog
 * Body: { items: ["牛肉", "牛乳", "パン"] }
 */
async function handleAIMatch(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  
  const { items } = body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return jsonResponse({ error: 'Invalid or empty items array' }, 400);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    // Get all catalog items
    const catalogItems = await getAllSpecials(env.SHOPLIST, controller.signal);
    
    if (catalogItems.length === 0) {
      return jsonResponse({ 
        error: 'Catalog is empty',
        matches: items.map(item => ({
          userInput: item,
          matches: [],
          bestMatch: null,
        }))
      }, 200);
    }
    
    const apiKey = env.OPENROUTER_API_KEY;
    
    // Try AI matching
    const matches = await hybridMatch(items, catalogItems, apiKey);
    
    clearTimeout(timeoutId);
    
    // Calculate total savings
    let totalSavings = 0;
    matches.forEach(match => {
      if (match.bestMatch && match.bestMatch.wasPrice) {
        totalSavings += (match.bestMatch.wasPrice - match.bestMatch.price);
      }
    });
    
    return jsonResponse({
      status: 'success',
      matches,
      catalogSize: catalogItems.length,
      totalSavings: Math.round(totalSavings * 100) / 100,
      method: matches[0]?.method || 'ai',
    });
  } catch (error) {
    console.error('Error in handleAIMatch:', error);
    return jsonResponse({ error: 'AI matching failed', details: error.message }, 500);
  }
}

/**
 * GET /api/specials-rapidapi
 * Get current specials from RapidAPI (Woolworths & Coles)
 */
async function handleGetSpecialsRapidAPI(request, env) {
  try {
    const apiKey = env.RAPIDAPI_KEY;
    if (!apiKey) {
      return jsonResponse({ 
        error: 'RapidAPI key not configured',
        help: 'Run: wrangler secret put RAPIDAPI_KEY'
      }, 500);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const specials = await getAllSpecialsRapidAPI(env.SHOPLIST, apiKey, controller.signal);
    
    clearTimeout(timeoutId);
    
    return jsonResponse({
      status: 'success',
      specials,
      count: specials.length,
      source: 'RapidAPI',
      cached: true,
    });
  } catch (error) {
    console.error('Error in handleGetSpecialsRapidAPI:', error);
    return jsonResponse({ 
      error: 'Failed to fetch specials from RapidAPI',
      details: error.message 
    }, 500);
  }
}

/**
 * GET /api/search-rapidapi?q=product_name
 * Search for a product using RapidAPI
 */
async function handleSearchProductRapidAPI(request, env) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  
  if (!query || query.trim().length === 0) {
    return jsonResponse({ error: 'Missing search query' }, 400);
  }

  const apiKey = env.RAPIDAPI_KEY;
  if (!apiKey) {
    return jsonResponse({ 
      error: 'RapidAPI key not configured',
      help: 'Run: wrangler secret put RAPIDAPI_KEY'
    }, 500);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const results = await searchProductRapidAPI(query.trim(), apiKey, env.SHOPLIST, controller.signal);
    
    clearTimeout(timeoutId);
    
    return jsonResponse({
      status: 'success',
      query,
      results,
      count: results.length,
      source: 'RapidAPI',
    });
  } catch (error) {
    console.error('Error in handleSearchProductRapidAPI:', error);
    return jsonResponse({ error: 'Search failed', details: error.message }, 500);
  }
}

/**
 * POST /api/ai-match-rapidapi
 * AI-powered item matching using RapidAPI catalog
 */
async function handleAIMatchRapidAPI(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  
  const { items } = body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return jsonResponse({ error: 'Invalid items array' }, 400);
  }

  const apiKey = env.RAPIDAPI_KEY;
  if (!apiKey) {
    return jsonResponse({ 
      error: 'RapidAPI key not configured',
      help: 'Run: wrangler secret put RAPIDAPI_KEY'
    }, 500);
  }

  const openRouterKey = env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return jsonResponse({ 
      error: 'OpenRouter API key not configured',
      help: 'Run: wrangler secret put OPENROUTER_API_KEY'
    }, 500);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);
    
    // Get all catalog items from RapidAPI
    const catalogItems = await getAllSpecialsRapidAPI(env.SHOPLIST, apiKey, controller.signal);
    
    if (catalogItems.length === 0) {
      return jsonResponse({ 
        error: 'Catalog is empty',
        matches: items.map(item => ({
          userInput: item,
          matches: [],
          bestMatch: null,
        }))
      }, 200);
    }
    
    // Try AI matching
    const matches = await hybridMatch(items, catalogItems, openRouterKey);
    
    clearTimeout(timeoutId);
    
    // Calculate total savings
    let totalSavings = 0;
    matches.forEach(match => {
      if (match.bestMatch && match.bestMatch.wasPrice) {
        totalSavings += (match.bestMatch.wasPrice - match.bestMatch.price);
      }
    });
    
    return jsonResponse({
      status: 'success',
      matches,
      catalogSize: catalogItems.length,
      totalSavings: Math.round(totalSavings * 100) / 100,
      method: matches[0]?.method || 'ai',
      source: 'RapidAPI',
    });
  } catch (error) {
    console.error('Error in handleAIMatchRapidAPI:', error);
    return jsonResponse({ error: 'AI matching failed', details: error.message }, 500);
  }
}

/**
 * Filter specials by relevance to user's shopping list using AI
 */
async function handleFilterSpecials(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  
  const { items, specials } = body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return jsonResponse({ error: 'Invalid items array' }, 400);
  }

  if (!Array.isArray(specials) || specials.length === 0) {
    return jsonResponse({ error: 'Invalid specials array' }, 400);
  }

  const openRouterKey = env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return jsonResponse({ 
      error: 'OpenRouter API key not configured',
      help: 'Run: wrangler secret put OPENROUTER_API_KEY'
    }, 500);
  }
  
  try {
    // Limit to first 100 specials to avoid token limits
    const specialsToAnalyze = specials.slice(0, 100);
    
    const prompt = `You are a shopping assistant analyzing special offers.

USER'S SHOPPING LIST:
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

SPECIAL OFFERS (${specialsToAnalyze.length} total):
${specialsToAnalyze.map((s, i) => `${i + 1}. ${s.name} - $${s.price} (was $${s.wasPrice}) at ${s.store}`).join('\n')}

TASK: Identify which special offers match items in the shopping list.
Consider:
- Direct matches (e.g., "milk" → "Full Cream Milk")
- Category matches (e.g., "meat" → "Beef Steak", "Chicken")
- Substitutes (e.g., "butter" → "Margarine")
- Complementary items (e.g., "pasta" → "Pasta Sauce")

OUTPUT FORMAT: Return ONLY comma-separated numbers of relevant specials.
Examples: "1,5,12" or "none" if no matches.
NO explanations, NO other text.`;

    // Try with fallback models
    const DEFAULT_MODEL = env.MODEL ?? 'deepseek/deepseek-chat-v3.1:free';
    const FALLBACK_MODELS = ['mistralai/mistral-7b-instruct:free', 'meta-llama/llama-3.1-8b-instruct:free'];
    const models = [DEFAULT_MODEL, ...FALLBACK_MODELS];
    
    let aiText = null;
    
    for (const model of models) {
      try {
        console.log('Trying filter model:', model);
        
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://shared-shopping-list.grocery-shopping-list.workers.dev',
            'X-Title': 'Shared Shopping List - Filter',
          },
          body: JSON.stringify({
            model: model.trim(),
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 500,
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          aiText = data.choices[0].message.content.trim();
          console.log('AI filtering response:', aiText);
          break; // Success, exit loop
        } else {
          console.log(`Model ${model} failed with status ${aiResponse.status}`);
          continue;
        }
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError);
        continue;
      }
    }
    
    if (!aiText) {
      throw new Error('All models failed for filtering');
    }
    
    if (aiText.toLowerCase() === 'none') {
      return jsonResponse({
        status: 'success',
        filtered: [],
        count: 0,
        totalSpecials: specials.length,
      });
    }
    
    // Parse the numbers
    const indices = aiText
      .split(',')
      .map(n => parseInt(n.trim()) - 1) // Convert to 0-based index
      .filter(n => !isNaN(n) && n >= 0 && n < specialsToAnalyze.length);
    
    const filtered = indices.map(i => specialsToAnalyze[i]);
    
    return jsonResponse({
      status: 'success',
      filtered,
      count: filtered.length,
      totalSpecials: specials.length,
      aiResponse: aiText,
    });
  } catch (error) {
    console.error('Error in handleFilterSpecials:', error);
    return jsonResponse({ error: 'AI filtering failed', details: error.message }, 500);
  }
}

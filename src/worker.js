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
            'Cache-Control': 'public, max-age=3600',
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
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: `You are a JSON generator that outputs only valid JSON. 
Do not include explanations, markdown, or text outside JSON.
If you cannot comply, output {"error":"invalid request"}.
Always follow the user's schema exactly.`
        },
        {
          role: 'user',
          content: `${prompt}。次のスキーマに完全準拠し、minified JSONのみを出力すること:
{"items":[{"label":"string","tags":["string"],"checked":false}]}

Use Japanese for labels. Use these store tags: Woolies, Coles, ALDI, IGA, Asian Grocery, Chemist, Kmart.`
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
  const DEFAULT_MODEL = env.MODEL ?? 'meta-llama/llama-3-8b-instruct:free';
  
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
 * free-tier model switch: Updated to use free models with fallback
 */
async function handleGenerate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { prompt, token } = body;

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

    // free-tier model switch: Generate with fallbacks
    const openRouterData = await generateWithFallbacks(prompt, env);
    
    // Extract content from response
    if (!openRouterData.choices || !openRouterData.choices[0] || !openRouterData.choices[0].message) {
      console.error('Invalid OpenRouter response structure:', openRouterData);
      return jsonResponse({ error: 'Invalid AI response' }, 502);
    }

    const content = openRouterData.choices[0].message.content;

    // free-tier model switch: Use safeParseList for validation
    const normalizedItems = safeParseList(content);

    // AI Suggestions Modal: Return suggestions without saving to KV
    // User will confirm before saving
    return jsonResponse({
      status: 'ok',
      suggestions: normalizedItems,
    });

    /* Original implementation: Save immediately to KV
    // Build new document
    const newDoc = {
      title: existingDoc.title || 'Shopping',
      items: normalizedItems,
      version: (existingDoc.version || 0) + 1,
      updated_at: Date.now(),
    };

    // Save to KV
    await env.SHOPLIST.put(kvKey, JSON.stringify(newDoc));

    return jsonResponse({
      status: 'success',
      items: normalizedItems,
    });
    */

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

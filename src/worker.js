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
 * POST /api/generate
 * Generate shopping list using AI (OpenRouter)
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

  // Call OpenRouter API
  try {
    const model = env.MODEL || 'meta-llama/llama-3-70b-instruct';
    const apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not configured');
      return jsonResponse({ error: 'AI service not configured' }, 500);
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content: 'You generate STRICT JSON shopping lists in Japanese. Output ONLY minified JSON with this schema and nothing else.',
          },
          {
            role: 'user',
            content: `${prompt}。以下のJSONスキーマに完全準拠し、余計な文章は一切返さないこと。必ずminifiedなJSONのみ出力: {"items":[{"label":"string","tags":"string[]","checked":false}]}.`,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!openRouterResponse.ok) {
      console.error('OpenRouter API error:', openRouterResponse.status, await openRouterResponse.text());
      return jsonResponse({ error: 'AI service error' }, 502);
    }

    const openRouterData = await openRouterResponse.json();
    
    // Extract content from response
    if (!openRouterData.choices || !openRouterData.choices[0] || !openRouterData.choices[0].message) {
      console.error('Invalid OpenRouter response structure:', openRouterData);
      return jsonResponse({ error: 'Invalid AI response' }, 502);
    }

    let content = openRouterData.choices[0].message.content;

    // Strip code fences if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Extract first JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      return jsonResponse({ error: 'AI did not return valid JSON' }, 502);
    }

    const generatedData = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!generatedData.items || !Array.isArray(generatedData.items)) {
      console.error('Invalid items structure:', generatedData);
      return jsonResponse({ error: 'Invalid AI response structure' }, 502);
    }

    // Normalize items
    const normalizedItems = [];
    for (let i = 0; i < generatedData.items.length; i++) {
      const item = generatedData.items[i];
      
      if (!item.label || typeof item.label !== 'string') {
        continue; // Skip invalid items
      }

      const label = item.label.trim().slice(0, 64);
      if (label.length === 0) {
        continue;
      }

      // Extract only first tag if tags array exists
      let tags = [];
      if (Array.isArray(item.tags) && item.tags.length > 0) {
        const firstTag = item.tags.find(tag => typeof tag === 'string' && tag.length > 0);
        if (firstTag) {
          tags = [firstTag];
        }
      }

      normalizedItems.push({
        id: crypto.randomUUID(),
        label: label,
        tags: tags,
        checked: false,
        pos: i,
        updated_at: Date.now(),
      });
    }

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

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('OpenRouter API timeout');
      return jsonResponse({ error: 'AI service timeout' }, 504);
    }
    console.error('Error in handleGenerate:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

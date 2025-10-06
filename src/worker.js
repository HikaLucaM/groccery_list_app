/**
 * Cloudflare Worker for Shared Shopping List API
 */

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
    // Return default empty list
    const defaultDoc = {
      title: 'Shopping',
      items: [],
    };
    return jsonResponse(defaultDoc);
  }

  const doc = JSON.parse(stored);
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

  // Validate and normalize items
  const items = body.items.map((item, index) => {
    if (!item.id || typeof item.label !== 'string' || typeof item.checked !== 'boolean') {
      throw new Error('Invalid item structure');
    }
    return {
      id: item.id,
      label: item.label,
      checked: item.checked,
      pos: index, // Renumber positions 0..N-1
      updated_at: item.updated_at || Date.now(),
    };
  });

  const doc = {
    title: body.title,
    items,
  };

  // Store in KV
  await kv.put(kvKey, JSON.stringify(doc));

  return jsonResponse({ ok: true });
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

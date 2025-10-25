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

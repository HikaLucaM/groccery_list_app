/**
 * RapidAPI Catalog Integration
 * 
 * Official APIs via RapidAPI:
 * 1. Coles Product Price API - price-changes endpoint
 * 2. Woolworths Products API - price-changes endpoint
 * 
 * These APIs provide price changes data which includes both price increases
 * and decreases (specials).
 */

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Fetch Coles price changes using RapidAPI
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} apiKey - RapidAPI key
 * @param {AbortSignal} signal - Abort signal
 * @param {number} pageSize - Number of results per page (default: 100)
 */
async function fetchColesPriceChangesRapidAPI(date, apiKey, signal, pageSize = 100) {
  try {
    const response = await fetch(
      `https://coles-product-price-api.p.rapidapi.com/coles/price-changes/?date=${date}&page=1&page_size=${pageSize}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'coles-product-price-api.p.rapidapi.com',
        },
        signal,
      }
    );

    if (!response.ok) {
      console.warn('Coles RapidAPI returned non-OK status:', response.status);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];

    // Filter for price decreases (specials) only
    return results
      .filter(product => product.new_price < product.old_price)
      .map(product => ({
        name: product.product_name || '',
        price: product.new_price || 0,
        wasPrice: product.old_price || null,
        discount: product.old_price ? Math.round(((product.old_price - product.new_price) / product.old_price) * 100) : 0,
        onSpecial: true,
        store: 'Coles',
        brand: product.product_brand || '',
        category: '',
        productId: product.barcode || '',
        imageUrl: '',
        url: product.url || '',
      }));
  } catch (error) {
    console.error('Error fetching Coles price changes (RapidAPI):', error);
    return [];
  }
}

/**
 * Fetch Woolworths price changes using RapidAPI
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} apiKey - RapidAPI key
 * @param {AbortSignal} signal - Abort signal
 * @param {number} pageSize - Number of results per page (default: 100)
 */
async function fetchWoolworthsPriceChangesRapidAPI(date, apiKey, signal, pageSize = 100) {
  try {
    const response = await fetch(
      `https://woolworths-products-api.p.rapidapi.com/woolworths/price-changes/?date=${date}&page=1&page_size=${pageSize}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'woolworths-products-api.p.rapidapi.com',
        },
        signal,
      }
    );

    if (!response.ok) {
      console.warn('Woolworths RapidAPI returned non-OK status:', response.status);
      return [];
    }

    const data = await response.json();
    const results = data.results || [];

    // Filter for price decreases (specials) only
    return results
      .filter(product => product.new_price < product.old_price)
      .map(product => ({
        name: product.product_name || '',
        price: product.new_price || 0,
        wasPrice: product.old_price || null,
        discount: product.old_price ? Math.round(((product.old_price - product.new_price) / product.old_price) * 100) : 0,
        onSpecial: true,
        store: 'Woolies',
        brand: product.product_brand || '',
        category: '',
        productId: product.barcode || '',
        imageUrl: '',
        url: product.url || '',
      }));
  } catch (error) {
    console.error('Error fetching Woolworths price changes (RapidAPI):', error);
    return [];
  }
}

/**
 * Get all specials from both stores using RapidAPI
 * @param {KVNamespace} kv - Cloudflare KV
 * @param {string} rapidApiKey - RapidAPI key
 * @param {AbortSignal} signal - Abort signal
 */
export async function getAllSpecialsRapidAPI(kv, rapidApiKey, signal) {
  // Try to get from cache first
  const cached = await kv.get('catalog:specials:rapidapi', 'json');
  
  if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached RapidAPI specials');
    return cached.specials || [];
  }
  
  console.log('Fetching fresh specials from RapidAPI');
  
  // Get price changes from the past week to find specials
  const dates = [];
  const today = new Date();
  
  // Try last 7 days to find recent price drops
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
  }
  
  const allSpecials = [];
  
  // Fetch from both stores for each date (try most recent first)
  for (const date of dates) {
    try {
      console.log(`Fetching price changes for ${date}`);
      
      const [colesSpecials, wooliesSpecials] = await Promise.all([
        fetchColesPriceChangesRapidAPI(date, rapidApiKey, signal, 50).catch(err => {
          console.error(`Coles fetch failed for ${date}:`, err);
          return [];
        }),
        fetchWoolworthsPriceChangesRapidAPI(date, rapidApiKey, signal, 50).catch(err => {
          console.error(`Woolies fetch failed for ${date}:`, err);
          return [];
        }),
      ]);
      
      allSpecials.push(...colesSpecials, ...wooliesSpecials);
      
      // If we have enough specials, stop fetching older dates
      if (allSpecials.length >= 100) {
        console.log(`Found ${allSpecials.length} specials, stopping...`);
        break;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error fetching price changes for ${date}:`, error);
    }
  }
  
  // Remove duplicates by product name (keep the best deal)
  const uniqueSpecials = Array.from(
    new Map(
      allSpecials
        .sort((a, b) => b.discount - a.discount) // Sort by discount % descending
        .map(p => [p.name.toLowerCase(), p])
    ).values()
  );
  
  console.log(`Fetched ${uniqueSpecials.length} unique specials from RapidAPI`);
  
  // Cache the results
  try {
    await kv.put('catalog:specials:rapidapi', JSON.stringify({
      specials: uniqueSpecials,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to cache RapidAPI specials:', error);
  }
  
  return uniqueSpecials;
}

/**
 * Search for a specific product using RapidAPI
 * Gets all cached specials and filters by query
 * @param {string} query - Product name
 * @param {string} rapidApiKey - RapidAPI key
 * @param {KVNamespace} kv - Cloudflare KV
 * @param {AbortSignal} signal - Abort signal
 */
export async function searchProductRapidAPI(query, rapidApiKey, kv, signal) {
  try {
    // Get all specials from cache or fetch fresh
    const allSpecials = await getAllSpecialsRapidAPI(kv, rapidApiKey, signal);
    
    // Filter by query (case-insensitive)
    const lowerQuery = query.toLowerCase();
    const results = allSpecials.filter(product => 
      product.name.toLowerCase().includes(lowerQuery) ||
      (product.brand && product.brand.toLowerCase().includes(lowerQuery))
    );
    
    return results;
  } catch (error) {
    console.error('Error searching products (RapidAPI):', error);
    return [];
  }
}

/**
 * Format specials data for AI prompt
 */
export function formatRapidAPISpecialsForAI(specials) {
  if (!specials || specials.length === 0) {
    return '現在、特売情報は取得できませんでした。';
  }
  
  // Group by store
  const wooliesSpecials = specials.filter(s => s.store === 'Woolies');
  const colesSpecials = specials.filter(s => s.store === 'Coles');
  
  let text = '【今週の特売情報 - RapidAPI経由】\n\n';
  
  if (wooliesSpecials.length > 0) {
    text += '■ Woolworths:\n';
    wooliesSpecials.slice(0, 15).forEach(product => {
      const discount = product.wasPrice 
        ? ` (通常$${product.wasPrice.toFixed(2)}, ${Math.round((1 - product.price / product.wasPrice) * 100)}% OFF)`
        : '';
      text += `- ${product.name}: $${product.price.toFixed(2)}${discount}\n`;
    });
    text += '\n';
  }
  
  if (colesSpecials.length > 0) {
    text += '■ Coles:\n';
    colesSpecials.slice(0, 15).forEach(product => {
      const discount = product.wasPrice 
        ? ` (通常$${product.wasPrice.toFixed(2)}, ${Math.round((1 - product.price / product.wasPrice) * 100)}% OFF)`
        : '';
      text += `- ${product.name}: $${product.price.toFixed(2)}${discount}\n`;
    });
  }
  
  return text;
}

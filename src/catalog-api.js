/**
 * Catalog API Integration Module
 * 
 * Integrates with Woolworths and Coles catalog APIs to fetch:
 * - Current prices
 * - Special offers
 * - Product availability
 * 
 * NOTE: Real APIs have limitations (auth, CORS, rate limits).
 * Using mock data for reliable demo. Replace with real APIs in production.
 */

import { 
  getAllMockSpecials, 
  searchMockProducts,
  MOCK_WOOLIES_SPECIALS,
  MOCK_COLES_SPECIALS 
} from './catalog-mock-data.js';

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

// Toggle between real API and mock data
const USE_MOCK_DATA = true; // Set to false to use real APIs

/**
 * Fetch Woolworths specials
 * Uses Woolworths' public API endpoint
 */
async function fetchWoolworthsSpecials(signal) {
  if (USE_MOCK_DATA) {
    // Return mock data
    return MOCK_WOOLIES_SPECIALS;
  }
  
  try {
    // Woolworths specials API - weekly catalogue
    const response = await fetch(
      'https://www.woolworths.com.au/apis/ui/browse/category?categoryId=1_894C50&pageNumber=1&pageSize=36&sortType=TraderRelevance',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal,
      }
    );

    if (!response.ok) {
      console.warn('Woolworths API returned non-OK status:', response.status);
      return [];
    }

    const data = await response.json();
    
    // Parse product data with multiple fallback paths
    const products = data.Bundles?.[0]?.Products || data.Products || [];
    
    console.log(`Woolworths: Found ${products.length} products`);
    
    return products.slice(0, 20).map(product => {
      // Try multiple price fields
      const price = product.Price || product.price || product.pricing?.now || 0;
      const wasPrice = product.WasPrice || product.wasPrice || product.pricing?.was || null;
      
      return {
        name: product.Name || product.DisplayName || product.name || product.displayName || '',
        price: typeof price === 'number' ? price : parseFloat(price) || 0,
        wasPrice: wasPrice ? (typeof wasPrice === 'number' ? wasPrice : parseFloat(wasPrice)) : null,
        discount: product.Discount || product.discount || null,
        onSpecial: product.IsOnSpecial || product.isOnSpecial || product.onSpecial || false,
        store: 'Woolies',
        brand: product.Brand || product.brand || '',
        size: product.PackageSize || product.packageSize || product.size || '',
        productId: product.Stockcode || product.stockcode || product.ProductId || product.productId || '',
        imageUrl: product.MediumImageFile || product.mediumImageFile || product.SmallImageFile || product.imageUrl || '',
      };
    });
  } catch (error) {
    console.error('Error fetching Woolworths specials:', error);
    return [];
  }
}

/**
 * Fetch Coles specials
 * Uses Coles' public API endpoint
 */
async function fetchColesSpecials(signal) {
  if (USE_MOCK_DATA) {
    // Return mock data
    return MOCK_COLES_SPECIALS;
  }
  
  try {
    // Coles specials API - half price specials
    const response = await fetch(
      'https://www.coles.com.au/api/products/search?pageNumber=1&pageSize=36&sortBy=name&onSpecial=true',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal,
      }
    );

    if (!response.ok) {
      console.warn('Coles API returned non-OK status:', response.status);
      return [];
    }

    const data = await response.json();
    
    // Parse product data
    const products = data.results || data.products || [];
    
    console.log(`Coles: Found ${products.length} products`);
    
    return products.slice(0, 20).map(product => {
      // Try multiple price field paths
      const price = product.pricing?.now || product.price || 0;
      const wasPrice = product.pricing?.was || product.wasPrice || null;
      const onSpecial = product.pricing?.onSpecial || product.onSpecial || false;
      
      return {
        name: product.name || product.displayName || '',
        price: typeof price === 'number' ? price : parseFloat(price) || 0,
        wasPrice: wasPrice ? (typeof wasPrice === 'number' ? wasPrice : parseFloat(wasPrice)) : null,
        discount: product.pricing?.comparable || product.discount || null,
        onSpecial,
        store: 'Coles',
        brand: product.brand || '',
        size: product.size || product.packageSize || '',
        productId: product.id || product.productId || '',
        imageUrl: product.imageUris?.[0]?.uri || product.imageUrl || '',
      };
    });
  } catch (error) {
    console.error('Error fetching Coles specials:', error);
    return [];
  }
}

/**
 * Search for a product across both stores
 * @param {string} query - Product name to search
 * @param {AbortSignal} signal - Abort signal for timeout
 * @returns {Promise<Array>} - Array of matching products
 */
export async function searchProduct(query, signal) {
  if (USE_MOCK_DATA) {
    // Search mock data
    return searchMockProducts(query);
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  
  try {
    // Fetch from both stores in parallel
    const [wooliesResults, colesResults] = await Promise.all([
      searchWoolworthsProduct(normalizedQuery, signal),
      searchColesProduct(normalizedQuery, signal),
    ]);
    
    return [...wooliesResults, ...colesResults];
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

/**
 * Search Woolworths for a specific product
 */
async function searchWoolworthsProduct(query, signal) {
  try {
    const response = await fetch(
      `https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=${encodeURIComponent(query)}&pageNumber=1&pageSize=12`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal,
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const products = data.Products || data.products || [];
    
    return products.slice(0, 5).map(product => {
      const price = product.Price || product.price || product.pricing?.now || 0;
      const wasPrice = product.WasPrice || product.wasPrice || product.pricing?.was || null;
      
      return {
        name: product.Name || product.DisplayName || product.name || '',
        price: typeof price === 'number' ? price : parseFloat(price) || 0,
        wasPrice: wasPrice ? (typeof wasPrice === 'number' ? wasPrice : parseFloat(wasPrice)) : null,
        onSpecial: product.IsOnSpecial || product.isOnSpecial || product.onSpecial || false,
        store: 'Woolies',
        brand: product.Brand || product.brand || '',
        size: product.PackageSize || product.packageSize || product.size || '',
        productId: product.Stockcode || product.stockcode || '',
        imageUrl: product.MediumImageFile || product.mediumImageFile || '',
      };
    });
  } catch (error) {
    console.error('Error searching Woolworths:', error);
    return [];
  }
}

/**
 * Search Coles for a specific product
 */
async function searchColesProduct(query, signal) {
  try {
    const response = await fetch(
      `https://www.coles.com.au/api/products/search?searchTerm=${encodeURIComponent(query)}&pageNumber=1&pageSize=12`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal,
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const products = data.results || data.products || [];
    
    return products.slice(0, 5).map(product => {
      const price = product.pricing?.now || product.price || 0;
      const wasPrice = product.pricing?.was || product.wasPrice || null;
      
      return {
        name: product.name || product.displayName || '',
        price: typeof price === 'number' ? price : parseFloat(price) || 0,
        wasPrice: wasPrice ? (typeof wasPrice === 'number' ? wasPrice : parseFloat(wasPrice)) : null,
        onSpecial: product.pricing?.onSpecial || product.onSpecial || false,
        store: 'Coles',
        brand: product.brand || '',
        size: product.size || product.packageSize || '',
        productId: product.id || product.productId || '',
        imageUrl: product.imageUris?.[0]?.uri || product.imageUrl || '',
      };
    });
  } catch (error) {
    console.error('Error searching Coles:', error);
    return [];
  }
}

/**
 * Get all current specials from both stores
 * Results are cached in KV for 1 hour
 */
export async function getAllSpecials(kv, signal) {
  // Try to get from cache first
  const cached = await kv.get('catalog:specials', 'json');
  
  if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached specials');
    return cached.specials || [];
  }
  
  // Fetch fresh data
  console.log('Fetching fresh specials from APIs');
  
  // Use Promise.all to fetch in parallel
  const [wooliesSpecials, colesSpecials] = await Promise.all([
    fetchWoolworthsSpecials(signal).catch(err => {
      console.error('Woolies fetch failed:', err);
      return [];
    }),
    fetchColesSpecials(signal).catch(err => {
      console.error('Coles fetch failed:', err);
      return [];
    }),
  ]);
  
  const allSpecials = [...wooliesSpecials, ...colesSpecials];
  
  console.log(`Fetched ${allSpecials.length} specials total`);
  
  // Cache the results
  try {
    await kv.put('catalog:specials', JSON.stringify({
      specials: allSpecials,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to cache specials:', error);
  }
  
  return allSpecials;
}

/**
 * Format specials data for AI prompt
 * Creates a concise summary of current deals
 */
export function formatSpecialsForAI(specials) {
  if (!specials || specials.length === 0) {
    return '現在、特売情報は取得できませんでした。';
  }
  
  // Group by store
  const wooliesSpecials = specials.filter(s => s.store === 'Woolies');
  const colesSpecials = specials.filter(s => s.store === 'Coles');
  
  let text = '【今週の特売情報】\n\n';
  
  if (wooliesSpecials.length > 0) {
    text += '■ Woolworths:\n';
    wooliesSpecials.slice(0, 10).forEach(product => {
      const discount = product.wasPrice ? ` (通常$${product.wasPrice})` : '';
      text += `- ${product.name}: $${product.price}${discount}\n`;
    });
    text += '\n';
  }
  
  if (colesSpecials.length > 0) {
    text += '■ Coles:\n';
    colesSpecials.slice(0, 10).forEach(product => {
      const discount = product.wasPrice ? ` (通常$${product.wasPrice})` : '';
      text += `- ${product.name}: $${product.price}${discount}\n`;
    });
  }
  
  return text;
}

/**
 * Match shopping list items with catalog products
 * Returns price and deal information for each item
 */
export async function matchItemsWithCatalog(items, signal) {
  const results = [];
  
  for (const item of items) {
    try {
      const matches = await searchProduct(item.label, signal);
      
      if (matches.length > 0) {
        // Find best match (cheapest or on special)
        const bestDeal = matches.reduce((best, current) => {
          if (current.onSpecial && !best.onSpecial) return current;
          if (current.onSpecial === best.onSpecial && current.price < best.price) return current;
          return best;
        }, matches[0]);
        
        results.push({
          itemId: item.id,
          itemLabel: item.label,
          catalogMatch: bestDeal,
          alternatives: matches.slice(0, 3),
        });
      } else {
        results.push({
          itemId: item.id,
          itemLabel: item.label,
          catalogMatch: null,
          alternatives: [],
        });
      }
    } catch (error) {
      console.error(`Error matching item ${item.label}:`, error);
      results.push({
        itemId: item.id,
        itemLabel: item.label,
        catalogMatch: null,
        alternatives: [],
      });
    }
  }
  
  return results;
}

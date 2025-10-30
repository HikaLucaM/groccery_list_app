/**
 * Mock Catalog Data for Demo
 * 
 * 実際のWoolworths/Coles APIは以下の理由でデモでは使用困難:
 * 1. APIに認証が必要な場合がある
 * 2. レート制限が厳しい
 * 3. CORS制限がある
 * 4. レスポンス構造が不安定
 * 
 * このファイルは、デモ用のモックデータを提供します。
 * 本番環境では、実際のAPIまたは公式APIサービスを使用してください。
 */

export const MOCK_WOOLIES_SPECIALS = [
  {
    name: 'Australian Beef Mince',
    price: 8.00,
    wasPrice: 12.00,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Australian Beef',
    size: '500g',
  },
  {
    name: 'Fresh Chicken Breast',
    price: 10.50,
    wasPrice: 15.00,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Woolworths',
    size: '1kg',
  },
  {
    name: 'Fresh Salmon Fillet',
    price: 20.00,
    wasPrice: 28.00,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Tasmanian Salmon',
    size: '500g',
  },
  {
    name: 'Tomatoes',
    price: 3.50,
    wasPrice: 5.00,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Fresh Produce',
    size: '1kg',
  },
  {
    name: 'Carrots',
    price: 2.00,
    wasPrice: 3.00,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Fresh Produce',
    size: '1kg',
  },
  {
    name: 'Potatoes',
    price: 3.00,
    wasPrice: 4.50,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Fresh Produce',
    size: '2kg',
  },
  {
    name: 'White Bread',
    price: 2.50,
    wasPrice: 4.00,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Wonder White',
    size: '700g',
  },
  {
    name: 'Full Cream Milk',
    price: 3.60,
    wasPrice: 4.50,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Dairy Farmers',
    size: '3L',
  },
  {
    name: 'Greek Yogurt',
    price: 4.00,
    wasPrice: 6.00,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Farmers Union',
    size: '1kg',
  },
  {
    name: 'Cheddar Cheese',
    price: 7.50,
    wasPrice: 10.00,
    onSpecial: true,
    store: 'Woolies',
    brand: 'Bega',
    size: '500g',
  },
];

export const MOCK_COLES_SPECIALS = [
  {
    name: 'Beef Scotch Fillet',
    price: 18.00,
    wasPrice: 25.00,
    onSpecial: true,
    store: 'Coles',
    brand: 'Coles Finest',
    size: '500g',
  },
  {
    name: 'Chicken Thigh Fillets',
    price: 9.00,
    wasPrice: 13.00,
    onSpecial: true,
    store: 'Coles',
    brand: 'Coles',
    size: '1kg',
  },
  {
    name: 'Prawns Cooked',
    price: 22.00,
    wasPrice: 30.00,
    onSpecial: true,
    store: 'Coles',
    brand: 'Coles',
    size: '500g',
  },
  {
    name: 'Broccoli',
    price: 2.50,
    wasPrice: 4.00,
    onSpecial: true,
    store: 'Coles',
    brand: 'Fresh',
    size: 'each',
  },
  {
    name: 'Capsicum',
    price: 4.00,
    wasPrice: 6.00,
    onSpecial: true,
    store: 'Coles',
    brand: 'Fresh',
    size: '500g',
  },
  {
    name: 'Onions',
    price: 2.00,
    wasPrice: 3.50,
    onSpecial: true,
    store: 'Coles',
    brand: 'Fresh',
    size: '1kg',
  },
  {
    name: 'Sourdough Bread',
    price: 3.50,
    wasPrice: 5.50,
    onSpecial: true,
    store: 'Coles',
    brand: 'Bakers Delight',
    size: '750g',
  },
  {
    name: 'Almond Milk',
    price: 2.50,
    wasPrice: 3.50,
    onSpecial: true,
    store: 'Coles',
    brand: 'Almond Breeze',
    size: '1L',
  },
  {
    name: 'Butter',
    price: 4.50,
    wasPrice: 6.50,
    onSpecial: true,
    store: 'Coles',
    brand: 'Western Star',
    size: '500g',
  },
  {
    name: 'Free Range Eggs',
    price: 5.00,
    wasPrice: 7.50,
    onSpecial: true,
    store: 'Coles',
    brand: 'Coles',
    size: '12 pack',
  },
];

/**
 * Search mock products by name
 */
export function searchMockProducts(query) {
  const allProducts = [...MOCK_WOOLIES_SPECIALS, ...MOCK_COLES_SPECIALS];
  const lowerQuery = query.toLowerCase();
  
  return allProducts.filter(product => 
    product.name.toLowerCase().includes(lowerQuery) ||
    product.brand.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all mock specials
 */
export function getAllMockSpecials() {
  return [...MOCK_WOOLIES_SPECIALS, ...MOCK_COLES_SPECIALS];
}

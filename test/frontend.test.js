/**
 * Test suite for frontend helper functions
 * 
 * Tests cover:
 * - Data normalization
 * - Token generation
 * - Tag filtering and validation
 */

import { describe, it, expect } from 'vitest';

// Helper functions extracted from frontend logic for testing
function normalizeListData(data) {
  const safeTitle = (data && typeof data.title === 'string') ? data.title : 'Shopping';
  const safeVersion = data && typeof data.version === 'number' ? data.version : 0;
  const safeUpdatedAt = data && Number.isFinite(data.updated_at) ? data.updated_at : Date.now();

  const safeItems = Array.isArray(data && data.items)
    ? data.items
        .filter((item) => item && typeof item.id === 'string' && item.id.length > 0)
        .map((item, index) => {
          const tags = Array.isArray(item.tags)
            ? item.tags.filter((tag) => typeof tag === 'string' && tag.length > 0)
            : [];

          let updatedAt = Number(item.updated_at);
          if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
            updatedAt = Date.now();
          }

          const pos = Number.isFinite(item.pos) ? Number(item.pos) : index;

          return {
            id: item.id,
            label: typeof item.label === 'string' ? item.label : '',
            checked: typeof item.checked === 'boolean' ? item.checked : Boolean(item.checked),
            tags,
            pos,
            updated_at: updatedAt,
          };
        })
    : [];

  safeItems.sort((a, b) => a.pos - b.pos);
  safeItems.forEach((item, index) => {
    item.pos = index;
  });

  return {
    title: safeTitle,
    items: safeItems,
    version: safeVersion,
    updated_at: safeUpdatedAt,
  };
}

function generateToken() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

describe('Frontend Helper Functions', () => {
  describe('normalizeListData', () => {
    it('should return default values for null/undefined input', () => {
      const result = normalizeListData(null);
      
      expect(result.title).toBe('Shopping');
      expect(result.items).toEqual([]);
      expect(result.version).toBe(0);
      expect(result.updated_at).toBeGreaterThan(0);
    });

    it('should use provided title when valid', () => {
      const input = {
        title: 'My Custom List',
        items: [],
      };
      
      const result = normalizeListData(input);
      expect(result.title).toBe('My Custom List');
    });

    it('should use default title when missing or invalid', () => {
      const result1 = normalizeListData({ items: [] });
      expect(result1.title).toBe('Shopping');

      const result2 = normalizeListData({ title: 123, items: [] });
      expect(result2.title).toBe('Shopping');

      const result3 = normalizeListData({ title: null, items: [] });
      expect(result3.title).toBe('Shopping');
    });

    it('should filter out items without valid id', () => {
      const input = {
        title: 'Test',
        items: [
          { id: 'valid-1', label: 'Valid Item', checked: false },
          { label: 'Missing ID', checked: false },
          { id: '', label: 'Empty ID', checked: false },
          { id: 'valid-2', label: 'Another Valid', checked: false },
        ],
      };

      const result = normalizeListData(input);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('valid-1');
      expect(result.items[1].id).toBe('valid-2');
    });

    it('should set default label for missing/invalid label', () => {
      const input = {
        title: 'Test',
        items: [
          { id: 'item-1', checked: false },
          { id: 'item-2', label: null, checked: false },
          { id: 'item-3', label: 123, checked: false },
        ],
      };

      const result = normalizeListData(input);
      expect(result.items[0].label).toBe('');
      expect(result.items[1].label).toBe('');
      expect(result.items[2].label).toBe('');
    });

    it('should normalize checked to boolean', () => {
      const input = {
        title: 'Test',
        items: [
          { id: 'item-1', label: 'Item 1', checked: true },
          { id: 'item-2', label: 'Item 2', checked: false },
          { id: 'item-3', label: 'Item 3', checked: 'true' },
          { id: 'item-4', label: 'Item 4', checked: 1 },
          { id: 'item-5', label: 'Item 5', checked: 0 },
          { id: 'item-6', label: 'Item 6' }, // missing
        ],
      };

      const result = normalizeListData(input);
      expect(result.items[0].checked).toBe(true);
      expect(result.items[1].checked).toBe(false);
      expect(result.items[2].checked).toBe(true); // truthy string
      expect(result.items[3].checked).toBe(true); // truthy number
      expect(result.items[4].checked).toBe(false); // falsy number
      expect(result.items[5].checked).toBe(false); // undefined -> false
    });

    it('should filter invalid tags', () => {
      const input = {
        title: 'Test',
        items: [
          {
            id: 'item-1',
            label: 'Item',
            checked: false,
            tags: ['valid', '', null, undefined, 123, 'another-valid', ''],
          },
        ],
      };

      const result = normalizeListData(input);
      expect(result.items[0].tags).toEqual(['valid', 'another-valid']);
    });

    it('should set default empty tags array if missing', () => {
      const input = {
        title: 'Test',
        items: [
          { id: 'item-1', label: 'Item', checked: false },
        ],
      };

      const result = normalizeListData(input);
      expect(result.items[0].tags).toEqual([]);
    });

    it('should normalize positions sequentially', () => {
      const input = {
        title: 'Test',
        items: [
          { id: 'item-3', label: 'Third', checked: false, pos: 100 },
          { id: 'item-1', label: 'First', checked: false, pos: 5 },
          { id: 'item-2', label: 'Second', checked: false, pos: 50 },
        ],
      };

      const result = normalizeListData(input);
      expect(result.items[0].label).toBe('First');
      expect(result.items[0].pos).toBe(0);
      expect(result.items[1].label).toBe('Second');
      expect(result.items[1].pos).toBe(1);
      expect(result.items[2].label).toBe('Third');
      expect(result.items[2].pos).toBe(2);
    });

    it('should set default position based on index if missing', () => {
      const input = {
        title: 'Test',
        items: [
          { id: 'item-1', label: 'Item 1', checked: false },
          { id: 'item-2', label: 'Item 2', checked: false },
          { id: 'item-3', label: 'Item 3', checked: false },
        ],
      };

      const result = normalizeListData(input);
      expect(result.items[0].pos).toBe(0);
      expect(result.items[1].pos).toBe(1);
      expect(result.items[2].pos).toBe(2);
    });

    it('should set default updated_at if missing or invalid', () => {
      const beforeTime = Date.now();
      
      const input = {
        title: 'Test',
        items: [
          { id: 'item-1', label: 'No timestamp', checked: false },
          { id: 'item-2', label: 'Invalid timestamp', checked: false, updated_at: 'invalid' },
          { id: 'item-3', label: 'Negative timestamp', checked: false, updated_at: -100 },
        ],
      };

      const result = normalizeListData(input);
      const afterTime = Date.now();

      for (const item of result.items) {
        expect(item.updated_at).toBeGreaterThanOrEqual(beforeTime);
        expect(item.updated_at).toBeLessThanOrEqual(afterTime);
      }
    });

    it('should preserve valid updated_at timestamp', () => {
      const timestamp = 1234567890000;
      
      const input = {
        title: 'Test',
        items: [
          { id: 'item-1', label: 'Item', checked: false, updated_at: timestamp },
        ],
      };

      const result = normalizeListData(input);
      expect(result.items[0].updated_at).toBe(timestamp);
    });

    it('should handle version field correctly', () => {
      const result1 = normalizeListData({ title: 'Test', items: [], version: 5 });
      expect(result1.version).toBe(5);

      const result2 = normalizeListData({ title: 'Test', items: [] });
      expect(result2.version).toBe(0);

      const result3 = normalizeListData({ title: 'Test', items: [], version: 'invalid' });
      expect(result3.version).toBe(0);
    });

    it('should handle updated_at field for document correctly', () => {
      const timestamp = Date.now();
      
      const result1 = normalizeListData({ title: 'Test', items: [], updated_at: timestamp });
      expect(result1.updated_at).toBe(timestamp);

      const beforeTime = Date.now();
      const result2 = normalizeListData({ title: 'Test', items: [] });
      const afterTime = Date.now();
      expect(result2.updated_at).toBeGreaterThanOrEqual(beforeTime);
      expect(result2.updated_at).toBeLessThanOrEqual(afterTime);
    });

    it('should handle complex real-world data', () => {
      const input = {
        title: 'Grocery List',
        items: [
          {
            id: 'abc-123',
            label: 'Milk (2L)',
            checked: false,
            tags: ['woolies', 'dairy'],
            pos: 0,
            updated_at: 1698000000000,
          },
          {
            id: 'def-456',
            label: 'Bread',
            checked: true,
            tags: ['coles'],
            pos: 1,
            updated_at: 1698001000000,
          },
          {
            id: 'ghi-789',
            label: 'Eggs (12pk)',
            checked: false,
            tags: ['aldi', 'protein'],
            pos: 2,
            updated_at: 1698002000000,
          },
        ],
        version: 7,
        updated_at: 1698002000000,
      };

      const result = normalizeListData(input);
      
      expect(result.title).toBe('Grocery List');
      expect(result.version).toBe(7);
      expect(result.updated_at).toBe(1698002000000);
      expect(result.items).toHaveLength(3);
      
      expect(result.items[0].label).toBe('Milk (2L)');
      expect(result.items[0].checked).toBe(false);
      expect(result.items[0].tags).toEqual(['woolies', 'dairy']);
      
      expect(result.items[1].label).toBe('Bread');
      expect(result.items[1].checked).toBe(true);
      
      expect(result.items[2].label).toBe('Eggs (12pk)');
    });
  });

  describe('generateToken', () => {
    it('should generate token with correct length', () => {
      const token = generateToken();
      
      // Base64 of 16 bytes without padding should be ~22 chars
      expect(token.length).toBeGreaterThanOrEqual(20);
      expect(token.length).toBeLessThanOrEqual(24);
    });

    it('should generate URL-safe token', () => {
      const token = generateToken();
      
      // Should not contain +, /, or =
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      expect(token).not.toContain('=');
      
      // Should only contain alphanumeric, dash, underscore
      expect(token).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should generate cryptographically random tokens', () => {
      // Generate multiple tokens and check they don't follow a pattern
      const token1 = generateToken();
      const token2 = generateToken();
      const token3 = generateToken();
      
      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
      
      // Tokens should have different characters (not sequential)
      expect(token1.charCodeAt(0)).not.toBe(token2.charCodeAt(0));
    });
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('Frontend: saveItems removal', () => {
  it('does not reference saveItems anywhere in HTML/JS (global call)', async () => {
    // Files to check — include both root and public copies
    const filesToCheck = [
      path.resolve(__dirname, '..', 'index.html'),
      path.resolve(__dirname, '..', 'public', 'index.html'),
    ];

    const occurrences = [];

    for (const f of filesToCheck) {
      const content = await fs.readFile(f, 'utf8');
      if (content.includes('saveItems(') || content.includes('saveItems();')) {
        occurrences.push(f);
      }
    }

    // If any file contains a global saveItems invocation, fail and list filenames
    expect(occurrences).
      toEqual([], `Found saveItems() invocation in: ${occurrences.join(', ')}. Replace with saveList() or define saveItems.`);
  });
});

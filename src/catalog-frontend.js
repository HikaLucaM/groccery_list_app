/**
 * Catalog API Integration - Frontend Enhancement
 * 
 * このファイルは index.html の <script> タグ内に追加するコードです
 * 以下の機能を追加します:
 * 
 * 1. 特売情報の表示
 * 2. 価格バッジの表示
 * 3. AI生成時の特売オプション
 * 4. 価格比較機能
 */

// ============================================================
// Catalog API Functions
// ============================================================

let specialsData = [];
let priceMatches = new Map();

/**
 * Load current specials from API
 */
async function loadSpecials() {
  try {
    showSyncIndicator();
    // Show loading modal with elapsed time while fetching specials
    startSpecialsLoading();
    const opts = {};
    if (specialsAbortController) opts.signal = specialsAbortController.signal;
    const response = await fetch(`${API_BASE}/api/specials`, opts);
    const data = await response.json();
    
    if (data.status === 'success') {
      specialsData = data.specials;
      displaySpecialsSection(data.specials);
      console.log(`Loaded ${data.count} specials`);
    }
  } catch (error) {
    console.error('Failed to load specials:', error);
      if (error && error.name === 'AbortError') {
        // user cancelled
        stopSpecialsLoading(true);
        return;
      }
    // Fail silently - specials are optional
  } finally {
    stopSpecialsLoading();
    hideSyncIndicator();
  }
}

// ============================================================
// Specials loading modal + elapsed timer
// ============================================================

let specialsLoadingDeferred = null;
let specialsLoadingStart = 0;
let specialsLoadingInterval = null;
let specialsModalShown = false;
let specialsAbortController = null;
let specialsAborted = false;

function updateSpecialsElapsed() {
  const elapsedSec = Math.max(0, (performance.now() - specialsLoadingStart) / 1000);
  const el = document.getElementById('specialsLoadingElapsed');
  if (el) el.textContent = elapsedSec.toFixed(1);
}

function startSpecialsLoading() {
  // Reset
  // Abort any previous in-progress controller
  if (specialsAbortController) {
    try { specialsAbortController.abort(); } catch (e) {}
    specialsAbortController = null;
  }
  specialsAborted = false;
  specialsAbortController = new AbortController();
  specialsLoadingStart = performance.now();
  specialsModalShown = false;

  // Only show modal if fetch is still running after 160ms to avoid flicker
  specialsLoadingDeferred = setTimeout(() => {
    const modal = document.getElementById('specialsLoadingModal');
    if (modal) {
      modal.classList.add('show');
      specialsModalShown = true;
      updateSpecialsElapsed();
      specialsLoadingInterval = setInterval(updateSpecialsElapsed, 100);
    }
  }, 160);
}

function stopSpecialsLoading(aborted = false) {
  try {
    // Cancel deferred show if not yet shown
    if (specialsLoadingDeferred) {
      clearTimeout(specialsLoadingDeferred);
      specialsLoadingDeferred = null;
    }

    // Compute elapsed
    const elapsedSec = Math.max(0, (performance.now() - specialsLoadingStart) / 1000);

    // If modal was shown, update and then hide after short delay
    const modal = document.getElementById('specialsLoadingModal');
    if (modal && specialsModalShown) {
      const el = document.getElementById('specialsLoadingElapsed');
      if (el) el.textContent = elapsedSec.toFixed(1);

      // show 'Done' with toast and hide modal after 1.2s
      setTimeout(() => {
        modal.classList.remove('show');
      }, 1200);
    }

    // Clear timer if set
    if (specialsLoadingInterval) {
      clearInterval(specialsLoadingInterval);
      specialsLoadingInterval = null;
    }

    // Show how long it took only if this wasn't effectively instantaneous
    if (!aborted && elapsedSec >= 0.3) {
      showToast(`特売情報を取得しました（${elapsedSec.toFixed(1)}秒）`);
    }

    if (aborted) {
      showToast('特売情報の取得をキャンセルしました', true);
    }

    // Reset controller
    if (specialsAbortController) {
      try { specialsAbortController.abort(); } catch (e) {}
      specialsAbortController = null;
    }
  } catch (e) {
    // Nothing
  }
}

function cancelSpecialsLoading() {
  specialsAborted = true;
  if (specialsAbortController) {
    try { specialsAbortController.abort(); } catch (e) {}
    specialsAbortController = null;
  }

  // Stop UI and show toast
  stopSpecialsLoading(true);
}

// Expose cancellation to global scope for onclick handlers
try {
  window.cancelSpecialsLoading = cancelSpecialsLoading;
} catch (e) {
  // no-op in test environments
}

/**
 * Display specials section in UI
 */
function displaySpecialsSection(specials) {
  // Check if section already exists
  let section = document.getElementById('specialsSection');
  
  if (!section) {
    // Create section
    section = document.createElement('div');
    section.id = 'specialsSection';
    section.className = 'specials-section';
    
    // Insert after header
    const header = document.querySelector('.header');
    header.insertAdjacentElement('afterend', section);
  }
  
  // Group by store
  const wooliesSpecials = specials.filter(s => s.store === 'Woolies').slice(0, 12);
  const colesSpecials = specials.filter(s => s.store === 'Coles').slice(0, 12);
  
  section.innerHTML = `
    <div class="specials-header">
      <div class="specials-title">
        🔥 今週の特売
        <span style="font-size: 13px; color: #6b7280; font-weight: 600;">
          (${specialsData.length}件)
        </span>
      </div>
      <button class="refresh-specials-btn" onclick="refreshSpecials()">
        🔄 更新
      </button>
    </div>
    <div class="specials-tabs">
      <button class="specials-tab active" onclick="showSpecialsTab('woolies')">
        Woolworths (${wooliesSpecials.length})
      </button>
      <button class="specials-tab" onclick="showSpecialsTab('coles')">
        Coles (${colesSpecials.length})
      </button>
    </div>
    <div class="specials-list" id="specialsList">
      ${renderSpecialsList(wooliesSpecials)}
    </div>
  `;
}

/**
 * Render specials list HTML
 */
function renderSpecialsList(specials) {
  if (specials.length === 0) {
    return '<div style="padding: 20px; text-align: center; color: #6b7280;">特売情報がありません</div>';
  }
  
  return specials.map(special => {
    const wasPrice = special.wasPrice ? `<span class="special-item-was">$${special.wasPrice.toFixed(2)}</span>` : '';
    const storeClass = special.store === 'Woolies' ? 'tag-woolies' : 'tag-coles';
    
    return `
      <div class="special-item" onclick="addSpecialToList('${escapeHtml(special.name)}', '${special.store}', ${special.price})">
        <div class="special-item-store ${storeClass}">${special.store}</div>
        <div class="special-item-name">${escapeHtml(special.name)}</div>
        <div class="special-item-price">
          $${special.price.toFixed(2)}
          ${wasPrice}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Show specific specials tab
 */
function showSpecialsTab(store) {
  const tabs = document.querySelectorAll('.specials-tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  
  event.target.classList.add('active');
  
  const specials = store === 'woolies' 
    ? specialsData.filter(s => s.store === 'Woolies').slice(0, 12)
    : specialsData.filter(s => s.store === 'Coles').slice(0, 12);
  
  document.getElementById('specialsList').innerHTML = renderSpecialsList(specials);
}

/**
 * Refresh specials from API
 */
async function refreshSpecials() {
  await loadSpecials();
  showToast('特売情報を更新しました');
}

/**
 * Add special to shopping list
 */
function addSpecialToList(name, store, price) {
  const input = document.getElementById('newItemInput');
  const tagSelect = document.getElementById('tagSelect');
  
  input.value = name;
  tagSelect.value = store;
  
  // Trigger add
  handleAddItem();
  
  showToast(`"${name}" をリストに追加しました`);
}

/**
 * Match current list items with catalog
 */
async function matchListWithCatalog() {
  if (listData.items.length === 0) return;
  
  try {
    showSyncIndicator();
    
    const response = await fetch(`${API_BASE}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: listData.items })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      // Store matches
      priceMatches.clear();
      data.matches.forEach(match => {
        if (match.catalogMatch) {
          priceMatches.set(match.itemId, match.catalogMatch);
        }
      });
      
      // Re-render list to show prices
      renderList();
      
      // Show total savings if any
      if (data.totalSavings > 0) {
        showToast(`💰 合計節約額: $${data.totalSavings.toFixed(2)}`);
      }
    }
  } catch (error) {
    console.error('Failed to match prices:', error);
  } finally {
    hideSyncIndicator();
  }
}

/**
 * Enhanced AI Generate with specials option
 */
async function showAIGenerateModal() {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'aiGenerateModal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <h2>🤖 AIで買い物リストを生成</h2>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
        どんな買い物リストが必要ですか?
      </p>
      
      <textarea 
        id="aiPromptInput" 
        placeholder="例: 平日5日分の夕食の材料&#10;例: 週末のバーベキューに必要なもの&#10;例: 一人暮らしの基本的な食材"
        style="width: 100%; padding: 16px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; min-height: 120px; resize: vertical; font-family: inherit;"
      ></textarea>
      
      <div class="ai-option-checkbox">
        <input type="checkbox" id="useSpecialsCheckbox" checked>
        <label for="useSpecialsCheckbox">
          🔥 今週の特売商品を優先的に使用する (${specialsData.length}件)
        </label>
      </div>
      
      <div class="modal-actions">
        <button class="modal-btn-secondary" onclick="closeAIGenerateModal()">
          キャンセル
        </button>
        <button class="modal-btn-primary" onclick="executeAIGenerate()">
          生成する
        </button>
      </div>
    </div>
  `;
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeAIGenerateModal();
    }
  });
  
  document.body.appendChild(modal);
  
  // Focus on textarea
  setTimeout(() => {
    document.getElementById('aiPromptInput').focus();
  }, 100);
}

function closeAIGenerateModal() {
  const modal = document.getElementById('aiGenerateModal');
  if (modal) {
    modal.remove();
  }
}

async function executeAIGenerate() {
  const promptInput = document.getElementById('aiPromptInput');
  const useSpecials = document.getElementById('useSpecialsCheckbox').checked;
  const prompt = promptInput.value.trim();
  
  if (!prompt) {
    showToast('プロンプトを入力してください');
    return;
  }
  
  closeAIGenerateModal();
  
  // Show loading modal
  document.getElementById('aiLoadingModal').classList.add('show');
  
  try {
    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        token: currentToken,
        useSpecials
      })
    });
    
    const data = await response.json();
    
    if (data.status === 'ok' && data.suggestions) {
      // Hide loading modal
      document.getElementById('aiLoadingModal').classList.remove('show');
      
      // Show suggestions modal
      showAISuggestionsModal(data.suggestions);
      
      // Show message if specials were used
      if (data.specialsUsed) {
        showToast(`✨ ${data.specialsCount}件の特売情報を使用しました`);
      }
    } else {
      throw new Error(data.error || 'AI generation failed');
    }
  } catch (error) {
    document.getElementById('aiLoadingModal').classList.remove('show');
    showToast('❌ ' + (error.message || 'AI生成に失敗しました'));
    console.error('AI generation error:', error);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Add price badge to item rendering
 * 既存の renderList() 関数を拡張する必要があります
 */
function renderItemWithPrice(item) {
  // Get price info if available
  const priceInfo = priceMatches.get(item.id);
  
  let priceBadgeHtml = '';
  if (priceInfo) {
    const onSpecial = priceInfo.onSpecial;
    const badgeClass = onSpecial ? 'on-special' : 'regular';
    const wasPrice = priceInfo.wasPrice 
      ? `<div class="price-was">通常 $${priceInfo.wasPrice.toFixed(2)}</div>`
      : '';
    
    priceBadgeHtml = `
      <div class="item-price-info">
        <div class="price-badge ${badgeClass}">
          ${onSpecial ? '🔥 ' : ''}$${priceInfo.price.toFixed(2)}
        </div>
        ${wasPrice}
      </div>
    `;
  }
  
  // 既存のアイテムHTML + 価格バッジ
  // これは既存のrenderList関数に統合する必要があります
  return priceBadgeHtml;
}

// ============================================================
// Additional CSS (add to <style> section)
// ============================================================

const additionalStyles = `
  /* Specials Tabs */
  .specials-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .specials-tab {
    flex: 1;
    padding: 10px 16px;
    background: #f3f4f6;
    border: 2px solid transparent;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .specials-tab:hover {
    background: #e5e7eb;
  }
  
  .specials-tab.active {
    background: white;
    border-color: #10b981;
    color: #059669;
  }
`;

// ============================================================
// Initialization
// ============================================================

// Load specials on page load
document.addEventListener('DOMContentLoaded', () => {
  // Load specials after initial list load
  setTimeout(() => {
    loadSpecials();
  }, 1000);
  
  // Match prices after list is loaded
  setTimeout(() => {
    matchListWithCatalog();
  }, 2000);
  
  // Refresh specials every 30 minutes
  setInterval(loadSpecials, 30 * 60 * 1000);
});

// Update AI generate button to use new modal
document.getElementById('aiGenerateBtn').addEventListener('click', (e) => {
  e.preventDefault();
  showAIGenerateModal();
});

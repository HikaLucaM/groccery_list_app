# 💬 Copilot Chat 用プロンプト (リファイン版)

You are adding an AI-powered "Shopping Concierge" feature to the Shared Shopping List app
that is currently built with Cloudflare Workers and Cloudflare KV, using vanilla JS on the frontend.
The repository is available, so re-use existing functions and data structures instead of inventing new ones.

---

## ✨ Context from the current code

- The Worker currently exposes `/api/list/:token` (GET/PUT/DELETE) and uses a KV binding named `SHOPLIST`.
- Each list document has the shape: `{ title: string, items: Item[], version: number, updated_at: number }`.
- Each item is normalized by `normalizeItem` (see `src/worker.js`): it must have `id: string`, `label: string`, `checked: boolean`, `tags: string[]`, `pos: number`, `updated_at: number`.
- The frontend stores list state in `listData`, and refreshes the UI via the `render()` function defined in `index.html` (there is no `renderList`).
- API calls are made via `loadList()` and `saveList()`.  The API base URL is stored in `API_BASE` and points to the deployed Worker endpoint.
- Tags are stored as an array; there is a predefined list of tags (Woolies, Coles, ALDI, IGA, Asian Grocery, Chemist, Kmart) and custom tags are stored in `localStorage`.

---

## 🔎 Goal

Add a new endpoint and UI integration so that a user can enter a natural-language prompt (e.g. “平日5日分の夕食の買い物リストを作って”) and receive a generated shopping list. The AI (via OpenRouter) must return a STRICT JSON object which will replace the current list items. The new list must conform to the existing data model (`label`, `tags`, `checked`, `pos`, etc.).

---

## 🔧 Tasks

### 1. Cloudflare Worker: Create `/api/generate`
Implement a new POST endpoint at `/api/generate` in `src/worker.js`:

#### Request body
```json
{ "prompt": "<string>", "token": "<string>" }
```
- `prompt`: natural-language description of what list the user wants.
- `token`: the current list token (same as used for `/api/list/:token`).

#### Flow
1. Validate the token format using the existing `TOKEN_PATTERN` from `worker.js`.
2. Fetch the existing list document from KV (`env.SHOPLIST.get("list:<token>", "text")`). If it doesn’t exist, start from the default document returned by `createDefaultDocument()`.
3. Call the OpenRouter API to generate a list:
   ```
   POST https://openrouter.ai/api/v1/chat/completions
   Headers:
     Authorization: Bearer ${env.OPENROUTER_API_KEY}
     Content-Type: application/json
   Body:
     {
       "model": env.MODEL ?? "meta-llama/llama-3-70b-instruct",
       "temperature": 0.2,
       "top_p": 0.9,
       "max_tokens": 600,
       "messages": [
         {
           "role": "system",
           "content": "You generate STRICT JSON shopping lists in Japanese. Output ONLY minified JSON with this schema and nothing else."
         },
         {
           "role": "user",
           "content": `${prompt}。以下のJSONスキーマに完全準拠し、余計な文章は一切返さないこと。必ずminifiedなJSONのみ出力: {\"items\":[{\"label\":\"string\",\"tags\":\"string[]\",\"checked\":false}]}.`
         }
       ]
     }
   ```
   - Use `env.MODEL` as an optional override (so the model can be changed without code changes). Default to `meta-llama/llama-3-70b-instruct`.
   - Wrap the call with a timeout (e.g. using `AbortController`) so the Worker does not hang if OpenRouter is slow.

4. Parse the response safely:
   - Extract the first choice’s `message.content`.
   - Use `JSON.parse`, but if the content contains backticks or extraneous text, strip code fences and take only the first `{...}` block.
   - Validate the structure: there must be an `items` array; each element must have a `label` string (1–64 chars) and an optional `tags` array of strings. Ignore any unknown fields.

5. Normalize items:
   ```js
   const normalized = {
     id: crypto.randomUUID(),
     label: item.label.trim().slice(0, 64),
     tags: Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string' && tag.length > 0).slice(0, 1) : [],
     checked: false,
     pos: index,
     updated_at: Date.now()
   };
   ```
   - Use only the first tag from the tags array (since the UI supports a single tag per item).

6. Build the new document:
   ```js
   const newDoc = {
     title: existingDoc.title ?? 'Shopping',
     items: normalizedItems,
     version: (existingDoc.version || 0) + 1,
     updated_at: Date.now()
   };
   ```

7. Save it to KV: `env.SHOPLIST.put("list:" + token, JSON.stringify(newDoc))`.

8. Return a JSON response with the new document and CORS headers (use `jsonResponse` helper):
   ```json
   { "status": "success", "items": normalizedItems }
   ```

#### Error handling
- Return 400 if `prompt` or `token` is missing or malformed.
- Return 502 if the OpenRouter call fails or returns non-JSON.
- Catch unexpected errors and return 500.

---

### 2. Frontend (index.html)
Modify the existing UI (no external dependencies) to add an “AIでリストを作成” button:

1. Place the button near the existing input bar (“追加” button).
2. On click:
   ```js
   const description = window.prompt("どんなリストを作りますか？例: 平日5日分の夕食の買い物リスト");
   if (!description) return;
   ```
   - Disable the button and show a temporary “生成中…” state.
   - Send a POST request to `${API_BASE}/api/generate` with `{ prompt: description, token }`.
   - On success:
     ```js
     listData = { title: listData.title, items: resp.items, version: listData.version + 1, updated_at: Date.now() };
     render();
     saveList();
     ```
   - On failure: `alert("AI生成に失敗しました。もう一度お試しください。")`.
   - Re-enable the button after completion.

3. Debounce user input (3–5s cooldown).

---

### 3. Security & Secrets

- Do **not** hardcode the OpenRouter API key.
- Use the secret stored as `OPENROUTER_API_KEY` via Wrangler: `env.OPENROUTER_API_KEY`.
- Keep KV binding name as `SHOPLIST`.
- Sanitize and truncate user input fields.

---

### 4. Testing Notes

Run locally:
```bash
wrangler dev
```
Then open:
```
http://127.0.0.1:8787/?t=<your_token>
```
Test that the “AIでリストを作成” button correctly calls `/api/generate`, and confirm the list refreshes via `render()`.

---

### 5. Deliverables

- Worker code with `/api/generate` endpoint.
- Updated frontend JS (button, prompt, fetch, render call).
- Code comments with test instructions.

Ensure consistency with existing code style and helpers.


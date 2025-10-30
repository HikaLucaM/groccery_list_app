// Cloudflare Pages Functions - middleware to handle API routes
// This allows the same worker code to run on Pages

import worker from '../src/worker.js';

export async function onRequest(context) {
  // Pass the request to the worker
  return worker.fetch(context.request, context.env, context);
}

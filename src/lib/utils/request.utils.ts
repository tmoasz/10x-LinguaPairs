/**
 * Utility functions for safely working with Request objects in Cloudflare Workers.
 *
 * In Cloudflare Workers, methods on Request objects (like json(), text(), etc.)
 * can lose their 'this' context if the Request object is destructured or passed
 * in certain ways. This utility ensures methods are called with the correct context.
 */

/**
 * Safely parses JSON from a Request object.
 * This prevents "Illegal invocation" errors in Cloudflare Workers.
 *
 * @param request - The Request object to parse JSON from
 * @returns Promise resolving to the parsed JSON object
 */
export async function safeRequestJson<T = unknown>(request: Request): Promise<T> {
  // Use Request.prototype.json.call() to ensure correct 'this' context
  // This prevents "Illegal invocation" errors in Cloudflare Workers
  return Request.prototype.json.call(request) as Promise<T>;
}

/**
 * Safely reads text from a Request object.
 * This prevents "Illegal invocation" errors in Cloudflare Workers.
 *
 * @param request - The Request object to read text from
 * @returns Promise resolving to the text content
 */
export async function safeRequestText(request: Request): Promise<string> {
  // Use Request.prototype.text.call() to ensure correct 'this' context
  return Request.prototype.text.call(request);
}

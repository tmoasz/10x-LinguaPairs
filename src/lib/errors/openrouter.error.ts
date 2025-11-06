/**
 * Base error class for OpenRouter service errors.
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Authorization error (401/403) - invalid or missing API key.
 * No retry should be attempted.
 */
export class OpenRouterAuthorizationError extends OpenRouterError {
  constructor(message = "Invalid or missing API key", details?: Record<string, unknown>) {
    super(message, "AUTHORIZATION_ERROR", 401, details);
    this.name = "OpenRouterAuthorizationError";
  }
}

/**
 * Rate limit error (429) - too many requests.
 * Retry with backoff should be attempted.
 */
export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(message = "Rate limit exceeded", details?: Record<string, unknown>) {
    super(message, "RATE_LIMIT_ERROR", 429, details);
    this.name = "OpenRouterRateLimitError";
  }
}

/**
 * Validation error (400) - invalid request payload.
 * No retry should be attempted.
 */
export class OpenRouterValidationError extends OpenRouterError {
  constructor(message = "Invalid request", details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "OpenRouterValidationError";
  }
}

/**
 * Context length error - token limit exceeded.
 * No retry should be attempted.
 */
export class OpenRouterContextLengthError extends OpenRouterError {
  constructor(message = "Context length exceeded", details?: Record<string, unknown>) {
    super(message, "CONTEXT_LENGTH_ERROR", 400, details);
    this.name = "OpenRouterContextLengthError";
  }
}

/**
 * Content filter error - content was filtered.
 * Retry with modified prompt may be attempted.
 */
export class OpenRouterContentFilterError extends OpenRouterError {
  constructor(message = "Content was filtered", details?: Record<string, unknown>) {
    super(message, "CONTENT_FILTER_ERROR", 400, details);
    this.name = "OpenRouterContentFilterError";
  }
}

/**
 * Timeout or network error.
 * Retry may be attempted.
 */
export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message = "Request timeout", details?: Record<string, unknown>) {
    super(message, "TIMEOUT_ERROR", 408, details);
    this.name = "OpenRouterTimeoutError";
  }
}

/**
 * Network error - connection failed.
 * Retry may be attempted.
 */
export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message = "Network error", details?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", 503, details);
    this.name = "OpenRouterNetworkError";
  }
}

/**
 * Parse error - response could not be parsed (e.g., invalid JSON Schema response).
 * No retry should be attempted.
 */
export class OpenRouterParseError extends OpenRouterError {
  constructor(message = "Failed to parse response", details?: Record<string, unknown>) {
    super(message, "PARSE_ERROR", 422, details);
    this.name = "OpenRouterParseError";
  }
}

/**
 * Server error (5xx) - provider server error.
 * Retry with backoff should be attempted.
 */
export class OpenRouterServerError extends OpenRouterError {
  constructor(message = "Provider server error", details?: Record<string, unknown>) {
    super(message, "SERVER_ERROR", 500, details);
    this.name = "OpenRouterServerError";
  }
}

import type {
  ChatRequestOptions,
  ChatResponse,
  ChatJsonResponse,
  JsonSchemaSpec,
  Logger,
  ModelParams,
  OpenRouterServiceOptions,
  RetryOptions,
  StreamCallbacks,
} from "./openrouter.types";
import {
  OpenRouterAuthorizationError,
  OpenRouterContentFilterError,
  OpenRouterContextLengthError,
  OpenRouterError,
  OpenRouterNetworkError,
  OpenRouterParseError,
  OpenRouterRateLimitError,
  OpenRouterServerError,
  OpenRouterTimeoutError,
  OpenRouterValidationError,
} from "@/lib/errors/openrouter.error";
import { chatRequestOptionsSchema } from "@/lib/validation/openrouter.validation";
import { ZodError } from "zod";
import { getConfig, getConfigNumber } from "@/lib/services/config.service";

/**
 * Default configuration values.
 */
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY: Required<RetryOptions> = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};
const DEFAULT_APP_TITLE = "10x-LinguaPairs";

/**
 * OpenRouter service for LLM chat integration.
 *
 * Provides synchronous and streaming (SSE) chat capabilities with structured
 * JSON responses, retry/backoff, timeouts, and error handling.
 *
 * Usage:
 * ```ts
 * const service = new OpenRouterService({
 *   apiKey: import.meta.env.OPENROUTER_API_KEY,
 *   defaultModel: "anthropic/claude-3.5-sonnet",
 * });
 *
 * const response = await service.chat({
 *   messages: [
 *     { role: "system", content: "You are a helpful assistant." },
 *     { role: "user", content: "Hello!" },
 *   ],
 * });
 * ```
 */
export class OpenRouterService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private defaultModel: string;
  private defaultParams: ModelParams;
  private readonly appTitle: string;
  private readonly siteUrl: string | undefined;
  private readonly timeoutMs: number;
  private readonly retry: Required<RetryOptions>;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: Logger | undefined;

  /**
   * Creates a new OpenRouter service instance.
   *
   * @param options - Service configuration options
   * @throws {OpenRouterAuthorizationError} If API key is missing or invalid
   */
  constructor(options: OpenRouterServiceOptions) {
    // Validate required API key
    if (!options.apiKey || typeof options.apiKey !== "string" || options.apiKey.trim() === "") {
      throw new OpenRouterAuthorizationError("API key is required and must be a non-empty string");
    }

    this.apiKey = options.apiKey.trim();
    this.baseUrl = options.baseUrl?.trim() || DEFAULT_BASE_URL;
    this.defaultModel = options.defaultModel || "";
    this.defaultParams = options.defaultParams || {};
    this.appTitle = options.appTitle || DEFAULT_APP_TITLE;
    this.siteUrl = options.siteUrl?.trim();
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.retry = {
      maxRetries: options.retry?.maxRetries ?? DEFAULT_RETRY.maxRetries,
      baseDelayMs: options.retry?.baseDelayMs ?? DEFAULT_RETRY.baseDelayMs,
      maxDelayMs: options.retry?.maxDelayMs ?? DEFAULT_RETRY.maxDelayMs,
    };
    const providedFetch = options.fetchImpl;
    const globalFetch = typeof globalThis.fetch === "function" ? globalThis.fetch : undefined;

    if (!providedFetch && !globalFetch) {
      throw new OpenRouterValidationError("Fetch API is not available in this environment");
    }

    if (providedFetch) {
      this.fetchImpl = providedFetch;
    } else if (globalFetch) {
      this.fetchImpl = ((...args: Parameters<typeof fetch>) => globalFetch.apply(globalThis, args)) as typeof fetch;
    } else {
      // Should be unreachable due to the guard above, but keeps TypeScript satisfied without non-null assertions.
      throw new OpenRouterValidationError("Fetch API is not available in this environment");
    }
    this.logger = options.logger;

    // Validate timeout
    if (this.timeoutMs <= 0) {
      throw new OpenRouterValidationError("Timeout must be a positive number");
    }

    // Validate retry settings
    if (this.retry.maxRetries < 0) {
      throw new OpenRouterValidationError("maxRetries must be non-negative");
    }
    if (this.retry.baseDelayMs < 0 || this.retry.maxDelayMs < 0) {
      throw new OpenRouterValidationError("Retry delays must be non-negative");
    }
    if (this.retry.baseDelayMs > this.retry.maxDelayMs) {
      throw new OpenRouterValidationError("baseDelayMs must not exceed maxDelayMs");
    }
  }

  /**
   * Updates the default model and/or parameters for subsequent requests.
   *
   * @param model - Optional new default model name
   * @param params - Optional new default parameters
   */
  setDefaults(model?: string, params?: ModelParams): void {
    if (model !== undefined) {
      this.defaultModel = model;
    }
    if (params !== undefined) {
      this.defaultParams = { ...this.defaultParams, ...params };
    }
  }

  /**
   * Synchronous chat request (non-streaming).
   *
   * @param options - Chat request options
   * @returns Normalized chat response
   * @throws {OpenRouterError} Various error types based on failure scenario
   */
  async chat(options: ChatRequestOptions): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      this.validateRequest(options);
      const payload = this.buildPayload(options, false);
      const response = await this.makeRequest(payload, options.signal);
      const normalized = await this.normalizeResponse(response);
      const duration = Date.now() - startTime;

      this.logger?.info?.(`Chat request completed`, {
        model: normalized.model,
        duration,
        finishReason: normalized.finishReason,
      });

      return normalized;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof OpenRouterError ? error.code : "UNKNOWN";

      this.logger?.error?.(`Chat request failed`, {
        error: errorMessage,
        errorCode,
        duration,
      });

      throw error;
    }
  }

  /**
   * Synchronous chat request with structured JSON response.
   *
   * @param options - Chat request options with JSON Schema specification
   * @param schemaName - Name of the schema
   * @param schema - JSON Schema definition
   * @returns Parsed structured response and raw response
   * @throws {OpenRouterError} Various error types based on failure scenario
   */
  async chatJson<T = unknown>(
    options: ChatRequestOptions,
    schemaName: string,
    schema: Record<string, unknown>
  ): Promise<ChatJsonResponse<T>> {
    this.validateRequest(options);

    const responseFormat: JsonSchemaSpec = {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    };

    const payload = this.buildPayload({ ...options, responseFormat }, false);
    const response = await this.makeRequest(payload, options.signal);
    const normalized = await this.normalizeResponse(response);

    // Parse and validate JSON response
    try {
      const parsed = JSON.parse(normalized.content) as T;
      return {
        parsed,
        raw: normalized,
      };
    } catch (error) {
      throw new OpenRouterParseError("Failed to parse JSON response", {
        rawContent: normalized.content.substring(0, 500),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Streaming chat request (SSE).
   *
   * @param options - Chat request options
   * @param callbacks - Stream event callbacks
   * @throws {OpenRouterError} Various error types based on failure scenario
   */
  async chatStream(options: ChatRequestOptions, callbacks: StreamCallbacks): Promise<void> {
    this.validateRequest(options);
    const payload = this.buildPayload(options, true);
    await this.makeStreamRequest(payload, options.signal, callbacks);
  }

  /**
   * Validates chat request options using Zod schema.
   *
   * @private
   */
  private validateRequest(options: ChatRequestOptions): void {
    try {
      chatRequestOptionsSchema.parse(options);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, unknown> = {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        };
        throw new OpenRouterValidationError("Invalid request options", details);
      }
      throw new OpenRouterValidationError(error instanceof Error ? error.message : "Invalid request options");
    }

    // Ensure model is set
    if (!options.model && !this.defaultModel) {
      throw new OpenRouterValidationError("Model must be specified either in request or as default");
    }
  }

  /**
   * Builds OpenRouter API payload from request options.
   *
   * @private
   */
  private buildPayload(options: ChatRequestOptions, stream: boolean): unknown {
    const model = options.model || this.defaultModel;
    const params = { ...this.defaultParams, ...options.params };

    const payload: Record<string, unknown> = {
      model,
      messages: options.messages,
      stream,
    };

    // Add parameters only if they are defined
    if (params.temperature !== undefined) payload.temperature = params.temperature;
    if (params.top_p !== undefined) payload.top_p = params.top_p;
    if (params.max_tokens !== undefined) payload.max_tokens = params.max_tokens;
    if (params.presence_penalty !== undefined) payload.presence_penalty = params.presence_penalty;
    if (params.frequency_penalty !== undefined) payload.frequency_penalty = params.frequency_penalty;
    if (params.stop !== undefined) payload.stop = params.stop;
    if (params.seed !== undefined) payload.seed = params.seed;

    // Add response_format if provided
    if (options.responseFormat) {
      payload.response_format = options.responseFormat;
    }

    return payload;
  }

  /**
   * Builds HTTP headers for OpenRouter API request.
   *
   * @private
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.siteUrl) {
      headers["HTTP-Referer"] = this.siteUrl;
    }

    headers["X-Title"] = this.appTitle;

    return headers;
  }

  /**
   * Gets the full API endpoint URL.
   *
   * @private
   */
  private getEndpointUrl(): string {
    const base = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
    return `${base}/chat/completions`;
  }

  /**
   * Makes HTTP request with retry logic and timeout.
   *
   * @private
   */
  private async makeRequest(payload: unknown, signal?: AbortSignal): Promise<Response> {
    const url = this.getEndpointUrl();
    const headers = this.buildHeaders();
    const body = JSON.stringify(payload);

    // Create timeout abort controller
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, this.timeoutMs);

    // Combine signals
    const combinedSignal = this.combineAbortSignals(
      [signal, timeoutController.signal].filter(Boolean) as AbortSignal[]
    );

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retry.maxRetries; attempt++) {
      try {
        this.logger?.debug?.(`OpenRouter request attempt ${attempt + 1}/${this.retry.maxRetries + 1}`);

        const response = await this.fetchImpl(url, {
          method: "POST",
          headers,
          body,
          signal: combinedSignal,
        });

        clearTimeout(timeoutId);

        // Handle non-2xx responses
        if (!response.ok) {
          const error = await this.handleErrorResponse(response, attempt);
          if (error.shouldRetry && attempt < this.retry.maxRetries) {
            const delay = this.calculateBackoffDelay(attempt);
            this.logger?.warn?.(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.retry.maxRetries + 1})`, {
              status: response.status,
              errorCode: error.error.code,
            });
            await this.sleep(delay);
            lastError = error.error;
            continue;
          }
          throw error.error;
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof OpenRouterError && !this.isRetryableError(error)) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw new OpenRouterTimeoutError("Request timeout exceeded", {
            timeoutMs: this.timeoutMs,
          });
        }

        if (error instanceof TypeError && error.message.includes("fetch")) {
          const networkError = new OpenRouterNetworkError("Network request failed", {
            attempt: attempt + 1,
          });
          if (attempt < this.retry.maxRetries) {
            const delay = this.calculateBackoffDelay(attempt);
            this.logger?.warn?.(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.retry.maxRetries + 1})`, {
              error: "Network error",
            });
            await this.sleep(delay);
            lastError = networkError;
            continue;
          }
          throw networkError;
        }

        if (attempt < this.retry.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logger?.warn?.(`Retrying after ${delay}ms (attempt ${attempt + 1}/${this.retry.maxRetries + 1})`);
          await this.sleep(delay);
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }

        throw error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new OpenRouterServerError("Max retries exceeded");
  }

  /**
   * Makes streaming HTTP request (SSE).
   *
   * @private
   */
  private async makeStreamRequest(
    payload: unknown,
    signal: AbortSignal | undefined,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const url = this.getEndpointUrl();
    const headers = this.buildHeaders();
    const body = JSON.stringify(payload);

    // Create timeout abort controller
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, this.timeoutMs);

    // Combine signals
    const combinedSignal = this.combineAbortSignals(
      [signal, timeoutController.signal].filter(Boolean) as AbortSignal[]
    );

    try {
      this.logger?.debug?.("OpenRouter streaming request started");

      const response = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.handleErrorResponse(response, 0);
        throw error.error;
      }

      if (!response.body) {
        throw new OpenRouterNetworkError("Response body is null");
      }

      // Parse SSE stream
      await this.parseSSEStream(response.body, callbacks, combinedSignal);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenRouterError) {
        callbacks.onError?.(error);
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new OpenRouterTimeoutError("Stream timeout exceeded", {
          timeoutMs: this.timeoutMs,
        });
        callbacks.onError?.(timeoutError);
        throw timeoutError;
      }

      const networkError = new OpenRouterNetworkError(error instanceof Error ? error.message : "Stream request failed");
      callbacks.onError?.(networkError);
      throw networkError;
    }
  }

  /**
   * Parses Server-Sent Events (SSE) stream.
   *
   * @private
   */
  private async parseSSEStream(
    stream: ReadableStream<Uint8Array>,
    callbacks: StreamCallbacks,
    signal: AbortSignal
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let aggregatedContent = "";
    let responseId = "";
    let responseModel = "";
    let finishReason: string | null = null;

    try {
      while (true) {
        if (signal.aborted) {
          throw new OpenRouterTimeoutError("Stream aborted");
        }

        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (SSE events are separated by \n\n)
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (signal.aborted) {
            throw new OpenRouterTimeoutError("Stream aborted");
          }

          // SSE format: "data: {json}" or "data: [DONE]"
          if (!line.startsWith("data: ")) {
            continue;
          }

          const data = line.slice(6); // Remove "data: " prefix

          // Check for end marker
          if (data.trim() === "[DONE]") {
            // Finalize response
            const finalResponse: ChatResponse = {
              id: responseId,
              model: responseModel || "unknown",
              content: aggregatedContent,
              finishReason,
              raw: {
                id: responseId,
                model: responseModel,
                finishReason,
              },
            };

            callbacks.onDone?.(aggregatedContent, finalResponse);
            return;
          }

          // Parse JSON data
          try {
            const parsed = JSON.parse(data) as {
              id?: string;
              model?: string;
              choices?: {
                delta?: { content?: string };
                finish_reason?: string | null;
              }[];
            };

            // Extract metadata from first chunk
            if (parsed.id && !responseId) {
              responseId = parsed.id;
            }
            if (parsed.model && !responseModel) {
              responseModel = parsed.model;
            }

            // Extract content delta
            const choice = parsed.choices?.[0];
            if (choice?.delta?.content) {
              const chunk = choice.delta.content;
              aggregatedContent += chunk;
              callbacks.onChunk?.(chunk);
            }

            // Check for finish reason
            if (choice?.finish_reason) {
              finishReason = choice.finish_reason;
            }
          } catch (parseError) {
            // Skip invalid JSON lines (might be empty lines or other SSE events)
            this.logger?.warn?.("Failed to parse SSE data line", parseError);
            continue;
          }
        }
      }

      // Stream ended normally (without [DONE])
      const finalResponse: ChatResponse = {
        id: responseId,
        model: responseModel || "unknown",
        content: aggregatedContent,
        finishReason,
        raw: {
          id: responseId,
          model: responseModel,
          finishReason,
        },
      };

      callbacks.onDone?.(aggregatedContent, finalResponse);
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }

      const streamError = new OpenRouterNetworkError(error instanceof Error ? error.message : "Stream parsing failed");
      callbacks.onError?.(streamError);
      throw streamError;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handles error response from API and maps to appropriate error type.
   *
   * @private
   */
  private async handleErrorResponse(
    response: Response,
    attempt: number
  ): Promise<{ error: OpenRouterError; shouldRetry: boolean }> {
    const status = response.status;
    let errorBody: unknown;

    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: await response.text().catch(() => "Unknown error") };
    }

    const details: Record<string, unknown> = {
      status,
      attempt: attempt + 1,
      body: errorBody,
    };

    // Map HTTP status codes to error types
    if (status === 401 || status === 403) {
      return {
        error: new OpenRouterAuthorizationError(status === 401 ? "Invalid API key" : "Forbidden", details),
        shouldRetry: false,
      };
    }

    if (status === 429) {
      return {
        error: new OpenRouterRateLimitError("Rate limit exceeded", details),
        shouldRetry: true,
      };
    }

    if (status === 400) {
      // Check for specific error types in response body
      const body = errorBody as Record<string, unknown>;
      const errorObj = body.error as { message?: string } | undefined;
      const errorMessage = (errorObj?.message || body.message || "Bad request") as string;

      if (errorMessage.toLowerCase().includes("context") || errorMessage.toLowerCase().includes("token")) {
        return {
          error: new OpenRouterContextLengthError("Context length exceeded", details),
          shouldRetry: false,
        };
      }

      if (errorMessage.toLowerCase().includes("filter")) {
        return {
          error: new OpenRouterContentFilterError("Content was filtered", details),
          shouldRetry: false,
        };
      }

      return {
        error: new OpenRouterValidationError(errorMessage, details),
        shouldRetry: false,
      };
    }

    if (status >= 500) {
      return {
        error: new OpenRouterServerError("Provider server error", details),
        shouldRetry: true,
      };
    }

    return {
      error: new OpenRouterError(`HTTP ${status}`, "UNKNOWN_ERROR", status, details),
      shouldRetry: false,
    };
  }

  /**
   * Normalizes OpenRouter API response to unified format.
   *
   * @private
   */
  private async normalizeResponse(response: Response): Promise<ChatResponse> {
    const data = (await response.json()) as {
      id?: string;
      model?: string;
      choices?: {
        message?: { content?: string };
        finish_reason?: string | null;
      }[];
    };

    const choice = data.choices?.[0];
    const content = choice?.message?.content || "";
    const finishReason = choice?.finish_reason || null;

    return {
      id: data.id || "",
      model: data.model || "unknown",
      content,
      finishReason,
      raw: data,
    };
  }

  /**
   * Calculates exponential backoff delay with jitter.
   *
   * @private
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.retry.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * this.retry.baseDelayMs;
    const delay = Math.min(exponentialDelay + jitter, this.retry.maxDelayMs);
    return Math.floor(delay);
  }

  /**
   * Checks if error is retryable.
   *
   * @private
   */
  private isRetryableError(error: OpenRouterError): boolean {
    return (
      error instanceof OpenRouterRateLimitError ||
      error instanceof OpenRouterServerError ||
      error instanceof OpenRouterNetworkError ||
      error instanceof OpenRouterTimeoutError
    );
  }

  /**
   * Combines multiple AbortSignals into one.
   *
   * @private
   */
  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    if (signals.length === 0) {
      const controller = new AbortController();
      return controller.signal;
    }

    if (signals.length === 1) {
      return signals[0];
    }

    const controller = new AbortController();

    signals.forEach((signal) => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener("abort", () => controller.abort());
      }
    });

    return controller.signal;
  }

  /**
   * Sleep utility for retry delays.
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Creates an OpenRouterService instance from database config and environment variables.
 *
 * This factory function reads configuration from the database (app_config table)
 * with fallback to environment variables for backward compatibility.
 * Secrets (API key) always come from environment variables.
 *
 * @param supabase - Supabase client instance (required for database config)
 * @returns Configured OpenRouterService instance
 * @throws {OpenRouterAuthorizationError} If OPENROUTER_API_KEY is not set
 */
export async function createOpenRouterService(): Promise<OpenRouterService> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterAuthorizationError("OPENROUTER_API_KEY environment variable is required");
  }

  // Read config from database with env fallback
  const baseUrl = (await getConfig("OPENROUTER_BASE_URL")) || undefined;
  const defaultModel = (await getConfig("OPENROUTER_DEFAULT_MODEL")) || undefined;
  const timeoutMs = (await getConfigNumber("OPENROUTER_TIMEOUT_MS")) || undefined;
  const appTitle = (await getConfig("OPENROUTER_APP_TITLE")) || undefined;
  const siteUrl = (await getConfig("OPENROUTER_SITE_URL")) || undefined;

  return new OpenRouterService({
    apiKey,
    baseUrl,
    defaultModel,
    timeoutMs,
    appTitle,
    siteUrl,
  });
}

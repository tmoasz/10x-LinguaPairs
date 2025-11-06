/**
 * Type definitions for OpenRouter service.
 */

/**
 * Chat message role according to OpenRouter API.
 */
export type ChatMessageRole = "system" | "user" | "assistant";

/**
 * Chat message structure.
 */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

/**
 * Model parameters for inference.
 */
export interface ModelParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string | string[];
  seed?: number;
}

/**
 * JSON Schema specification for structured responses.
 */
export interface JsonSchemaSpec {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  };
}

/**
 * Request metadata (optional).
 */
export type RequestMetadata = Record<string, unknown>;

/**
 * Configuration options for OpenRouter service constructor.
 */
export interface OpenRouterServiceOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultParams?: ModelParams;
  appTitle?: string;
  siteUrl?: string;
  timeoutMs?: number;
  retry?: RetryOptions;
  fetchImpl?: typeof fetch;
  logger?: Logger;
}

/**
 * Retry configuration options.
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Logger interface for optional telemetry.
 */
export interface Logger {
  debug?: (message: string, ...args: unknown[]) => void;
  info?: (message: string, ...args: unknown[]) => void;
  warn?: (message: string, ...args: unknown[]) => void;
  error?: (message: string, ...args: unknown[]) => void;
}

/**
 * Normalized chat response.
 */
export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  finishReason: string | null;
  raw: unknown;
}

/**
 * Structured JSON response (from chatJson).
 */
export interface ChatJsonResponse<T = unknown> {
  parsed: T;
  raw: ChatResponse;
}

/**
 * Stream event types for SSE.
 */
export type StreamEventType = "chunk" | "done" | "error";

/**
 * Stream event callbacks.
 */
export interface StreamCallbacks {
  onChunk?: (chunk: string) => void;
  onDone?: (finalContent: string, response: ChatResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Chat request options.
 */
export interface ChatRequestOptions {
  messages: ChatMessage[];
  model?: string;
  params?: ModelParams;
  responseFormat?: JsonSchemaSpec;
  metadata?: RequestMetadata;
  signal?: AbortSignal;
}

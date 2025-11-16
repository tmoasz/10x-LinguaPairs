/**
 * Configuration Service with Database-backed Runtime Configuration
 *
 * This service provides access to application configuration stored in the database,
 * with in-memory caching to minimize database queries. Falls back to environment
 * variables if a key is not found in the database (backward compatibility).
 *
 * Use cases:
 * - Runtime configuration changes without redeployment (e.g., model selection)
 * - Centralized configuration management via database
 * - Non-sensitive configuration values only (secrets stay in env vars)
 */

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

/**
 * In-memory cache for configuration values
 * Key: normalized config key, Value: { value, expiresAt }
 */
const configCache = new Map<string, CacheEntry>();

interface AppConfigValueRow {
  value: string | null;
}

function extractValue(row: AppConfigValueRow | null): string | null {
  if (!row) {
    return null;
  }

  const value = row.value;
  return typeof value === "string" ? value : null;
}

function readEnvVar(name?: string): string | null {
  if (!name) {
    return null;
  }
  const envRecord = import.meta.env as Record<string, string | undefined>;
  return envRecord[name] ?? null;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

/**
 * Default cache TTL in milliseconds (60 seconds)
 * Can be overridden by 'app_config_cache_ttl_seconds' config value
 */
const DEFAULT_CACHE_TTL_MS = 60 * 1000;

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.SUPABASE_KEY;

function getRestEndpoint(): string | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/app_config`;
}

async function fetchConfigRow(key: string): Promise<AppConfigValueRow | null> {
  const endpoint = getRestEndpoint();
  if (!endpoint) {
    return null;
  }

  const url = `${endpoint}?select=value&key=eq.${encodeURIComponent(key)}&limit=1`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY as string,
      Authorization: `Bearer ${SUPABASE_KEY as string}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    // eslint-disable-next-line no-console
    console.warn(`[ConfigService] Failed to fetch "${key}" from app_config: ${response.statusText}`);
    return null;
  }

  const rows = (await response.json()) as AppConfigValueRow[];
  return rows[0] ?? null;
}

/**
 * Gets the cache TTL from config or returns default
 */
async function getCacheTtl(): Promise<number> {
  const ttlKey = normalizeKey("app_config_cache_ttl_seconds");
  const cached = configCache.get(ttlKey);

  if (cached && cached.expiresAt > Date.now()) {
    const ttlSeconds = cached.value ? parseInt(cached.value, 10) : null;
    return ttlSeconds && ttlSeconds > 0 ? ttlSeconds * 1000 : DEFAULT_CACHE_TTL_MS;
  }

  const data = await fetchConfigRow(ttlKey);
  const ttlValue = extractValue(data);

  if (ttlValue) {
    const ttlSeconds = parseInt(ttlValue, 10);
    if (ttlSeconds > 0) {
      const ttlMs = ttlSeconds * 1000;
      // Cache the TTL value itself (with longer TTL to avoid recursion)
      configCache.set(ttlKey, {
        value: ttlValue,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes for TTL config
      });
      return ttlMs;
    }
  }

  return DEFAULT_CACHE_TTL_MS;
}

/**
 * Gets a configuration value from cache or database
 *
 * Priority:
 * 1. In-memory cache (if valid)
 * 2. Database (app_config table)
 * 3. Environment variable (fallback, same key as provided)
 *
 * @param key - Configuration key (case-sensitive env name, stored lowercase in DB)
 * @returns Configuration value or null if not found
 */
export async function getConfig(key: string): Promise<string | null> {
  const normalizedKey = normalizeKey(key);

  // Check cache first
  const cached = configCache.get(normalizedKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const data = await fetchConfigRow(normalizedKey);
  const dbValue = extractValue(data);

  let value: string | null = null;

  value = dbValue ?? readEnvVar(key);

  // Cache the result (even if null, to avoid repeated DB queries)
  const cacheTtl = await getCacheTtl();
  configCache.set(normalizedKey, {
    value,
    expiresAt: Date.now() + cacheTtl,
  });

  return value;
}

/**
 * Gets a configuration value as a number
 *
 * @param key - Configuration key
 * @param defaultValue - Default value if not found and not parseable
 * @returns Parsed number or defaultValue
 */
export async function getConfigNumber(key: string, defaultValue?: number): Promise<number | undefined> {
  const value = await getConfig(key);
  if (value === null) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Invalidates the cache for a specific key or all keys
 *
 * @param key - Optional key to invalidate. If not provided, clears entire cache.
 */
export function invalidateConfigCache(key?: string): void {
  if (key) {
    configCache.delete(normalizeKey(key));
  } else {
    configCache.clear();
  }
}

/**
 * Preloads configuration values into cache
 * Useful for warming up cache on application startup
 *
 * @param keys - Array of keys to preload
 */
export async function preloadConfig(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => getConfig(key)));
}

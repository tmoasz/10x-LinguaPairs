import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";
import { logger } from "@/lib/utils/logger";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.test if it exists (local development)
const envTestPath = resolve(__dirname, "../../.env.test");
if (existsSync(envTestPath)) {
  config({ path: envTestPath });
}

// Use environment variables from either .env.test or GitHub Actions secrets
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. " +
      "Add them to .env.test (local) or configure as GitHub Secrets (CI/CD). " +
      "For E2E tests, you need a service role key to delete users."
  );
}

/**
 * Create a Supabase admin client for test cleanup.
 * Uses service role key to bypass RLS and delete users.
 */
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Validates if a string is a valid UUID v4.
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Delete a user from the test database.
 * Prefers deleting by Supabase user ID when provided, falling back to email lookup.
 */
export async function deleteTestUser(email: string, userId?: string): Promise<void> {
  try {
    // Only use userId if it's a valid UUID
    if (userId && isValidUUID(userId)) {
      const { error: deleteByIdError } = await adminClient.auth.admin.deleteUser(userId);

      if (!deleteByIdError) {
        return;
      }

      // User no longer exists - allow fallback to email in case a new ID was issued
      if (deleteByIdError.status !== 404) {
        if (deleteByIdError.status === 403 || deleteByIdError.code === "not_admin") {
          return;
        }
        logger.error(`Error deleting user by id ${userId}:`, deleteByIdError);
      }
    }

    // First, get the user by email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      // Silently handle permission errors (403) - service role key may not be configured
      // This is expected in some test environments
      if (listError.status === 403 || listError.code === "not_admin") {
        return;
      }
      logger.error("Error listing users:", listError);
      return;
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      // User doesn't exist, nothing to delete
      return;
    }

    // Delete the user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      // Silently handle permission errors
      if (deleteError.status === 403 || deleteError.code === "not_admin") {
        return;
      }
      logger.error(`Error deleting user ${email}:`, deleteError);
    }
  } catch (error) {
    // Silently handle permission errors
    if (error && typeof error === "object" && "status" in error && error.status === 403) {
      return;
    }
    const userHint = userId ? `${email} (id: ${userId})` : email;
    logger.error(`Error in deleteTestUser for ${userHint}:`, error);
  }
}

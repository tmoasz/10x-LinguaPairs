import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Development helper: default user id to use in endpoints during MVP before auth wiring
export const DEFAULT_USER_ID: string = (import.meta as any).env?.DEFAULT_USER_ID ?? "";

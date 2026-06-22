import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER ONLY.
 * Bypasses RLS. Never import this into a Client Component or expose the key.
 * Used only inside protected route handlers / server actions for admin tasks
 * like provisioning user accounts.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
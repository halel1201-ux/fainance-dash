import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER ONLY.
 * Bypasses RLS. Never import this into a Client Component or expose the key.
 */

function env(name: string): string {
  // trim() neutralises a trailing newline/space that often sneaks in when a
  // key is pasted into a hosting dashboard (a common "Invalid API key" cause).
  return (process.env[name] ?? "").trim();
}

function decodeRole(jwt: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")
    );
    return payload.role ?? null;
  } catch {
    return null;
  }
}

/** Returns a clear Hebrew message if the server config is wrong, else null. */
export function adminConfigError(): string | null {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL חסר בסביבה (הוסף ב-Vercel ועשה Redeploy).";
  if (!key) return "SUPABASE_SERVICE_ROLE_KEY חסר בסביבה (הוסף ב-Vercel ועשה Redeploy).";
  if (key.split(".").length !== 3)
    return "SUPABASE_SERVICE_ROLE_KEY אינו מפתח תקין (אמור להיות JWT עם 3 חלקים).";
  const role = decodeRole(key);
  if (role !== "service_role")
    return `המפתח שהוגדר אינו service_role (התקבל role=${role ?? "לא ידוע"}). בדוק שהעתקת את המפתח הנכון.`;
  return null;
}

export function createAdminClient() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
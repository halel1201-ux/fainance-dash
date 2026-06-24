import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "broker" | "banker" | "nonbank";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  bank_id: string | null;
  is_active: boolean;
}

/** Returns the current user's profile, or null if not authenticated. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, bank_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
}
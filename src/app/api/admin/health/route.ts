import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { adminConfigError } from "@/lib/supabase/admin";

function info(v?: string) {
  const t = (v ?? "").trim();
  return { present: t.length > 0, length: t.length, prefix: t.slice(0, 6) };
}
function role(v?: string): string | null {
  try {
    return JSON.parse(
      Buffer.from((v ?? "").trim().split(".")[1], "base64url").toString("utf8")
    ).role ?? null;
  } catch {
    return null;
  }
}

/**
 * Admin-only diagnostic: shows whether env vars are present and well-formed,
 * WITHOUT leaking the secret (only length + 6-char prefix + decoded role).
 * Hit this on the live site to see exactly what is misconfigured.
 */
export async function GET() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  return NextResponse.json({
    ok: adminConfigError() === null,
    configError: adminConfigError(),
    url: info(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anon: { ...info(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), role: role(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    service: { ...info(process.env.SUPABASE_SERVICE_ROLE_KEY), role: role(process.env.SUPABASE_SERVICE_ROLE_KEY) },
  });
}
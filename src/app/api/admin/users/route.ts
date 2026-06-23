import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  full_name?: string;
  email?: string;
  password?: string;
  role?: "admin" | "broker" | "banker" | "nonbank";
  bank_id?: string | null;
  branch_area?: string | null;
};

export async function POST(req: Request) {
  // guard: only a logged-in admin may create users
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "מפתח השרת (SUPABASE_SERVICE_ROLE_KEY) לא מוגדר בסביבה. הוסף אותו ב-Vercel ועשה Redeploy." },
      { status: 500 }
    );
  }

  const body = (await req.json()) as Body;
  const { full_name, email, password, role } = body;
  const bank_id = body.bank_id || null;

  if (!full_name || !email || !password || !role) {
    return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
  }
  if ((role === "banker" || role === "nonbank") && !bank_id) {
    return NextResponse.json(
      { error: "בנקאי / חוץ-בנקאי חייב שיוך לבנק" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1) create the auth account (auto-confirmed so they can log in immediately)
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created?.user) {
    return NextResponse.json(
      { error: cErr?.message ?? "יצירת המשתמש נכשלה" },
      { status: 400 }
    );
  }

  // 2) create the profile row with role + bank
  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name,
    role,
    bank_id,
    branch_area: body.branch_area || null,
  });
  if (pErr) {
    // rollback to avoid an orphan auth user
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: pErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: created.user.id });
}
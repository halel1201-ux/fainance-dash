import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthlyPayment, primeToAnnualPct } from "@/lib/dti";

type Body = {
  client_id?: string;
  action?: "offer" | "reject";
  amount?: number;
  prime_delta?: number;
  term_months?: number;
};

export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile || (profile.role !== "banker" && profile.role !== "nonbank")) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  if (!profile.bank_id) {
    return NextResponse.json({ error: "לבנקאי אין שיוך לבנק" }, { status: 400 });
  }

  const body = (await req.json()) as Body;
  const { client_id, action } = body;
  if (!client_id || !action) {
    return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  }

  const admin = createAdminClient();

  // must have been shared with this banker
  const { data: share } = await admin
    .from("client_shares")
    .select("id")
    .eq("client_id", client_id)
    .eq("banker_id", profile.id)
    .maybeSingle();
  if (!share) {
    return NextResponse.json({ error: "הלקוח לא שותף איתך" }, { status: 403 });
  }

  // client (for the advisor recipient) + bank name (for the message)
  const [{ data: client }, { data: bank }] = await Promise.all([
    admin.from("clients").select("broker_id, full_name").eq("id", client_id).single(),
    admin.from("banks").select("name").eq("id", profile.bank_id).single(),
  ]);
  if (!client) {
    return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
  }
  const bankName = bank?.name ?? "הבנק";

  let message: string;
  let row: Record<string, unknown>;

  if (action === "reject") {
    row = {
      client_id,
      banker_id: profile.id,
      bank_id: profile.bank_id,
      amount: 0,
      prime_delta: 0,
      term_months: 0,
      monthly_payment: 0,
      status: "rejected",
    };
    message = `${profile.full_name} מ${bankName} דחה את הלקוח ${client.full_name}`;
  } else {
    const amount = Number(body.amount);
    const prime_delta = Number(body.prime_delta);
    const term_months = Number(body.term_months);
    if (!amount || !term_months || Number.isNaN(prime_delta)) {
      return NextResponse.json({ error: "מלא סכום, ריבית ופריסה" }, { status: 400 });
    }
    const mp = monthlyPayment(amount, primeToAnnualPct(prime_delta), term_months);
    row = {
      client_id,
      banker_id: profile.id,
      bank_id: profile.bank_id,
      amount,
      prime_delta,
      term_months,
      monthly_payment: Math.round(mp),
      status: "offered",
    };
    const sign = prime_delta === 0 ? "" : prime_delta > 0 ? `+${prime_delta}` : `${prime_delta}`;
    message =
      `${profile.full_name} מ${bankName} אישר ל${client.full_name} ` +
      `הלוואה של ₪${amount.toLocaleString("he-IL")} ל-${term_months} חודשים, ריבית פריים ${sign}% ` +
      `(החזר ~₪${Math.round(mp).toLocaleString("he-IL")} לחודש)`;
  }

  // upsert the offer (one row per banker per client). The partial unique index
  // offers_one_active_per_bank_client enforces the same-bank rule.
  const { error: upErr } = await admin
    .from("offers")
    .upsert(row, { onConflict: "client_id,banker_id" });

  if (upErr) {
    if (upErr.code === "23505") {
      return NextResponse.json(
        { error: `כבר קיימת הצעה פעילה מ${bankName} על לקוח זה — בנקאי אחר מהבנק שלך כבר הציע` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  // notify the advisor
  await admin.from("notifications").insert({
    recipient_id: client.broker_id,
    client_id,
    actor_id: profile.id,
    type: action === "reject" ? "rejection" : "offer",
    message,
  });

  return NextResponse.json({ ok: true });
}
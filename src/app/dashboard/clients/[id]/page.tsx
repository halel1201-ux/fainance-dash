import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ShareClient, { type BankerOption } from "@/components/ShareClient";

function fmt(n: number) {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}
function primeLabel(d: number) {
  if (d === 0) return "פריים";
  return `פריים ${d > 0 ? "+" : ""}${d}%`;
}

export default async function AdvisorClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/");

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, phone, net_income, monthly_repay, total_obligo")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  // bankers for the share picker
  const [{ data: bankerProfiles }, { data: banks }, { data: shares }, { data: offers }, { data: notes }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, bank_id, branch_area").in("role", ["banker", "nonbank"]),
      supabase.from("banks").select("id, name"),
      supabase.from("client_shares").select("banker_id").eq("client_id", id),
      supabase
        .from("offers")
        .select("banker_id, bank_id, amount, prime_delta, term_months, monthly_payment, status, created_at")
        .eq("client_id", id)
        .order("amount", { ascending: false }),
      supabase
        .from("notifications")
        .select("id, message, type, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const bankName = new Map((banks ?? []).map((b) => [b.id, b.name]));
  const profName = new Map((bankerProfiles ?? []).map((p) => [p.id, p.full_name]));

  const bankers: BankerOption[] = (bankerProfiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    bank_name: p.bank_id ? bankName.get(p.bank_id) ?? "—" : "—",
    branch_area: p.branch_area ?? null,
  }));
  const sharedIds = (shares ?? []).map((s) => s.banker_id as string);

  const activeOffers = (offers ?? []).filter((o) => o.status === "offered");
  const rejections = (offers ?? []).filter((o) => o.status === "rejected");

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard" className="text-muted text-sm hover:text-gold-light">
        ← חזרה לדשבורד
      </Link>

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.full_name}</h1>
          <p className="text-muted text-sm mt-1">
            הכנסה {fmt(client.net_income)} · החזר קיים {fmt(client.monthly_repay)} · אובליגו {fmt(client.total_obligo)}
          </p>
        </div>
        <ShareClient clientId={id} bankers={bankers} sharedIds={sharedIds} />
      </header>

      {/* notifications */}
      {(notes ?? []).length > 0 && (
        <section>
          <h2 className="font-bold mb-2">התראות</h2>
          <div className="space-y-2">
            {(notes ?? []).map((n) => (
              <div
                key={n.id}
                className="fh-card p-3 text-sm border-r-4"
                style={{
                  borderRightColor:
                    n.type === "rejection" ? "var(--color-bad)" : "var(--color-good)",
                }}
              >
                {n.message}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* auction */}
      <section>
        <h2 className="font-bold mb-2">הצעות מימון (מכרז) — {activeOffers.length}</h2>
        {activeOffers.length === 0 ? (
          <div className="fh-card p-6 text-center text-muted text-sm">
            עדיין אין הצעות. שתף את הלקוח עם בנקאים כדי לקבל הצעות מתחרות.
          </div>
        ) : (
          <div className="fh-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gold text-xs uppercase tracking-wide">
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">בנקאי</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">בנק</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">סכום</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">ריבית</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">פריסה</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">החזר חודשי</th>
                </tr>
              </thead>
              <tbody>
                {activeOffers.map((o, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-4 py-3">{profName.get(o.banker_id as string) ?? "—"}</td>
                    <td className="px-4 py-3">{bankName.get(o.bank_id as string) ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-gold">{fmt(o.amount)}</td>
                    <td className="px-4 py-3">{primeLabel(o.prime_delta)}</td>
                    <td className="px-4 py-3">{o.term_months} ח׳</td>
                    <td className="px-4 py-3">{fmt(o.monthly_payment ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rejections.length > 0 && (
          <p className="text-muted text-xs mt-2">
            {rejections.length} בנקאים דחו את הלקוח.
          </p>
        )}
      </section>
    </main>
  );
}
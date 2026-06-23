import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import OfferForm from "@/components/OfferForm";

function fmt(n: number) {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}
function primeLabel(d: number) {
  if (d === 0) return "פריים";
  return `פריים ${d > 0 ? "+" : ""}${d}%`;
}

export default async function BankerClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/");
  if (profile.role !== "banker" && profile.role !== "nonbank") redirect("/dashboard");

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, net_income, monthly_repay, total_obligo, has_rent, rent_amount")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound(); // RLS: not shared with this banker → no row

  const [{ data: offers }, { data: banks }] = await Promise.all([
    supabase
      .from("offers")
      .select("banker_id, bank_id, amount, prime_delta, term_months, monthly_payment, status")
      .eq("client_id", id)
      .order("amount", { ascending: false }),
    supabase.from("banks").select("id, name"),
  ]);

  const bankName = new Map((banks ?? []).map((b) => [b.id, b.name]));
  const all = offers ?? [];
  const mine = all.find((o) => o.banker_id === profile.id) ?? null;
  const activeOffers = all.filter((o) => o.status === "offered");

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/banker" className="text-muted text-sm hover:text-gold-light">
        ← חזרה ללקוחות
      </Link>

      <header>
        <h1 className="text-2xl font-bold">{client.full_name}</h1>
        <p className="text-muted text-sm mt-1">
          הכנסה {fmt(client.net_income)} · החזר קיים {fmt(client.monthly_repay)} · אובליגו{" "}
          {fmt(client.total_obligo)}
          {client.has_rent ? ` · שכירות ${fmt(client.rent_amount)}` : ""}
        </p>
      </header>

      <OfferForm
        clientId={id}
        existing={
          mine
            ? {
                amount: mine.amount,
                prime_delta: mine.prime_delta,
                term_months: mine.term_months,
                status: mine.status,
              }
            : null
        }
      />

      <section>
        <h2 className="font-bold mb-2">מכרז ההצעות — {activeOffers.length}</h2>
        {activeOffers.length === 0 ? (
          <div className="fh-card p-6 text-center text-muted text-sm">
            אין עדיין הצעות פעילות על הלקוח.
          </div>
        ) : (
          <div className="fh-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gold text-xs uppercase tracking-wide">
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">בנק</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">סכום</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">ריבית</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">פריסה</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">החזר חודשי</th>
                </tr>
              </thead>
              <tbody>
                {activeOffers.map((o, i) => {
                  const isMine = o.banker_id === profile.id;
                  return (
                    <tr key={i} className={`border-b border-white/5 ${isMine ? "bg-[rgba(200,164,92,.08)]" : ""}`}>
                      <td className="px-4 py-3">
                        {bankName.get(o.bank_id as string) ?? "—"}
                        {isMine && <span className="fh-badge fh-badge-gold mr-2">שלי</span>}
                      </td>
                      <td className="px-4 py-3 font-bold text-gold">{fmt(o.amount)}</td>
                      <td className="px-4 py-3">{primeLabel(o.prime_delta)}</td>
                      <td className="px-4 py-3">{o.term_months} ח׳</td>
                      <td className="px-4 py-3">{fmt(o.monthly_payment ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-muted text-xs mt-2">
          * שמות הבנקאים המתחרים מוסתרים — רואים בנק, סכום ותנאים בלבד.
        </p>
      </section>
    </main>
  );
}
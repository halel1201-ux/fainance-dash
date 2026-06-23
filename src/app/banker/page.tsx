import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function fmt(n: number) {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

export default async function BankerHome() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  if (profile.role !== "banker" && profile.role !== "nonbank") redirect("/dashboard");

  const supabase = await createClient();
  // RLS (clients_shared_banker) returns only clients shared with this banker
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, net_income, monthly_repay, total_obligo")
    .order("created_at", { ascending: false });

  // which of these the banker already acted on
  const { data: myOffers } = await supabase
    .from("offers")
    .select("client_id, status")
    .eq("banker_id", profile.id);
  const myStatus = new Map((myOffers ?? []).map((o) => [o.client_id as string, o.status as string]));

  const rows = clients ?? [];

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 p-4 flex flex-col border-l border-[color:var(--color-line)] bg-[linear-gradient(180deg,#0b1830,#0a1424)]">
        <Logo size="sm" className="mb-6" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 fh-badge-gold !rounded-lg font-bold">
          <span className="w-4 text-center">📥</span> לקוחות ששותפו איתי
        </div>
        <div className="mt-auto space-y-2">
          <span className="fh-badge fh-badge-good block w-fit">
            {profile.full_name} · {profile.role === "nonbank" ? "חוץ-בנקאי" : "בנקאי"}
          </span>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">לקוחות ששותפו איתי</h1>
          <p className="text-muted text-sm mt-1">{rows.length} לקוחות · לחץ לקוח כדי לתת הצעה</p>
        </header>

        {rows.length === 0 ? (
          <div className="fh-card p-10 text-center text-muted">
            עדיין לא שותפו איתך לקוחות. יועץ שישתף לקוח — הוא יופיע כאן.
          </div>
        ) : (
          <div className="fh-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gold text-xs uppercase tracking-wide">
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">לקוח</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">הכנסה נטו</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">החזר קיים</th>
                  <th className="text-right px-4 py-3 border-b border-[color:var(--color-line)]">הסטטוס שלי</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const st = myStatus.get(c.id);
                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/banker/clients/${c.id}`} className="text-gold-light hover:underline">
                          {c.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{fmt(c.net_income)}</td>
                      <td className="px-4 py-3">{fmt(c.monthly_repay)}</td>
                      <td className="px-4 py-3">
                        {st === "offered" ? (
                          <span className="fh-badge fh-badge-good">הצעתי</span>
                        ) : st === "rejected" ? (
                          <span className="fh-badge fh-badge-bad">דחיתי</span>
                        ) : (
                          <span className="fh-badge fh-badge-warn">ממתין להצעה</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
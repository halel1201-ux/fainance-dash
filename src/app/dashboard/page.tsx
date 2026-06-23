import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { statusFromPti, statusLabelOf, statusBadgeClass } from "@/lib/dti";

const ROLE_LABEL: Record<string, string> = {
  admin: "אדמין",
  broker: "מתווך",
  banker: "בנקאי",
  nonbank: "חוץ-בנקאי",
};

type ClientRow = {
  id: string;
  full_name: string;
  net_income: number;
  monthly_repay: number;
  has_rent: boolean;
  rent_amount: number;
};

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  if (profile.role === "admin") redirect("/dashboard/admin");
  if (profile.role === "banker" || profile.role === "nonbank") redirect("/banker");

  const supabase = await createClient();
  // RLS scopes this automatically: broker→own, banker→their brokers', etc.
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, net_income, monthly_repay, has_rent, rent_amount")
    .order("created_at", { ascending: false });

  const rows = (clients ?? []) as ClientRow[];
  const withDti = rows.map((c) => {
    const load = c.monthly_repay + (c.has_rent ? c.rent_amount : 0);
    const pti = c.net_income > 0 ? load / c.net_income : Infinity;
    const status = statusFromPti(pti);
    return { ...c, ptiPct: Math.round(pti * 100), status };
  });
  const hot = withDti.filter((r) => r.status === "hot").length;

  return (
    <div className="min-h-screen flex">
      {/* sidebar */}
      <aside className="w-60 shrink-0 p-4 flex flex-col border-l border-[color:var(--color-line)] bg-[linear-gradient(180deg,#0b1830,#0a1424)]">
        <Logo size="sm" className="mb-6" />
        <NavItem icon="🗂️" label="הלקוחות שלי" active />
        <Link href="/dashboard/clients/new">
          <NavItem icon="➕" label="לקוח חדש" />
        </Link>
        <NavItem icon="🏦" label="הצעות שהתקבלו" />
        <NavItem icon="📊" label="דוחות" />
        <div className="mt-auto space-y-2">
          <span className="fh-badge fh-badge-good block w-fit">
            {profile.full_name} · {ROLE_LABEL[profile.role]}
          </span>
          <LogoutButton />
        </div>
      </aside>

      {/* main */}
      <main className="flex-1 p-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">הלקוחות שלי</h1>
            <p className="text-muted text-sm mt-1">
              {rows.length} לקוחות · {hot} לוהטים 🔥 · יחס החזר בסיסי (PTI)
            </p>
          </div>
          <Link href="/dashboard/clients/new" className="fh-btn-gold">
            + לקוח חדש
          </Link>
        </header>

        {rows.length === 0 ? (
          <div className="fh-card p-10 text-center">
            <p className="text-muted">
              אין עדיין לקוחות במאגר שלך.{" "}
              <Link href="/dashboard/clients/new" className="text-gold-light underline">
                הוסף לקוח ראשון ←
              </Link>
            </p>
          </div>
        ) : (
          <div className="fh-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gold text-xs uppercase tracking-wide">
                  <Th>לקוח</Th>
                  <Th>הכנסה נטו</Th>
                  <Th>החזר חודשי</Th>
                  <Th>יחס החזר (PTI)</Th>
                  <Th>סטטוס</Th>
                </tr>
              </thead>
              <tbody>
                {withDti.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/dashboard/clients/${r.id}`} className="text-gold-light hover:underline">
                        {r.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">₪{r.net_income.toLocaleString("he-IL")}</td>
                    <td className="px-4 py-3">₪{r.monthly_repay.toLocaleString("he-IL")}</td>
                    <td className="px-4 py-3">{isFinite(r.ptiPct) ? `${r.ptiPct}%` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`fh-badge ${statusBadgeClass(r.status)}`}>
                        {statusLabelOf(r.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-muted text-xs mt-4">
          * יחס החזר בסיסי ברמת הלקוח. הדירוג המלא (PTI + LTV + חוק עוקף) מחושב
          ברמת העסקה בכרטיס הלקוח — בפיתוח.
        </p>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 ${
        active ? "fh-badge-gold !rounded-lg font-bold" : "text-muted"
      }`}
    >
      <span className="w-4 text-center">{icon}</span>
      {label}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-right font-bold px-4 py-3 border-b border-[color:var(--color-line)]">
      {children}
    </th>
  );
}
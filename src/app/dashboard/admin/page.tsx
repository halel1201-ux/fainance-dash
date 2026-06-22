import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import AddUserForm from "@/components/AddUserForm";
import AddBankForm from "@/components/AddBankForm";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ROLE_LABEL: Record<string, string> = {
  admin: "אדמין",
  broker: "מתווך",
  banker: "בנקאי",
  nonbank: "חוץ-בנקאי",
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  bank_id: string | null;
  is_active: boolean;
};
type Bank = { id: string; name: string; is_nonbank: boolean };

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: users }, { data: banks }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, bank_id, is_active").order("created_at", { ascending: false }),
    supabase.from("banks").select("id, name, is_nonbank").order("name"),
  ]);

  const userRows = (users ?? []) as ProfileRow[];
  const bankRows = (banks ?? []) as Bank[];
  const bankName = (id: string | null) => bankRows.find((b) => b.id === id)?.name ?? "—";

  const counts = {
    broker: userRows.filter((u) => u.role === "broker").length,
    banker: userRows.filter((u) => u.role === "banker").length,
    nonbank: userRows.filter((u) => u.role === "nonbank").length,
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 p-4 flex flex-col border-l border-[color:var(--color-line)] bg-[linear-gradient(180deg,#0b1830,#0a1424)]">
        <Logo size="sm" className="mb-6" />
        <NavItem icon="▦" label="סקירה" active />
        <NavItem icon="👥" label="משתמשים" active />
        <NavItem icon="🏦" label="בנקים וקבוצות" />
        <div className="mt-auto space-y-2">
          <span className="fh-badge fh-badge-good block w-fit">{profile.full_name} · אדמין</span>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 p-8 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">פאנל ניהול</h1>
            <p className="text-muted text-sm mt-1">ניהול משתמשים, תפקידים ובנקים</p>
          </div>
          <AddUserForm banks={bankRows} />
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi k="משתמשים" v={userRows.length} />
          <Kpi k="מתווכים" v={counts.broker} />
          <Kpi k="בנקאים" v={counts.banker} />
          <Kpi k="חוץ-בנקאיים" v={counts.nonbank} />
        </div>

        {/* users table */}
        <section>
          <h2 className="font-bold mb-3">משתמשים</h2>
          <div className="fh-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gold text-xs uppercase tracking-wide">
                  <Th>שם</Th><Th>תפקיד</Th><Th>שיוך</Th><Th>סטטוס</Th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="px-4 py-3 text-muted">{u.bank_id ? bankName(u.bank_id) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`fh-badge ${u.is_active ? "fh-badge-good" : "fh-badge-warn"}`}>
                        {u.is_active ? "פעיל" : "מושהה"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* banks */}
        <section>
          <h2 className="font-bold mb-3">בנקים וגופים</h2>
          <div className="fh-card p-5 space-y-4">
            <AddBankForm />
            <div className="flex flex-wrap gap-2">
              {bankRows.map((b) => (
                <span key={b.id} className={`fh-badge ${b.is_nonbank ? "fh-badge-warn" : "fh-badge-gold"}`}>
                  {b.name}{b.is_nonbank ? " · חוץ-בנקאי" : ""}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 ${active ? "fh-badge-gold !rounded-lg font-bold" : "text-muted"}`}>
      <span className="w-4 text-center">{icon}</span>
      {label}
    </div>
  );
}

function Kpi({ k, v }: { k: string; v: number }) {
  return (
    <div className="fh-card p-4">
      <div className="text-xs text-muted">{k}</div>
      <div className="text-2xl font-black text-gold mt-1">{v}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-right font-bold px-4 py-3 border-b border-[color:var(--color-line)]">{children}</th>;
}
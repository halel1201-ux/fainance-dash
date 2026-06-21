import Logo from "@/components/Logo";
import { computeDti, statusBadgeClass, type DtiInput } from "@/lib/dti";

// --- sample data (until Supabase is wired) — exercises the real DTI engine ---
type Row = { name: string; input: DtiInput; pulledBy?: string };

const SAMPLE: Row[] = [
  {
    name: "אבי מזרחי",
    pulledBy: "בנק לאומי",
    input: {
      netIncome: 24000,
      existingMonthlyRepayments: 2000,
      assetType: "property",
      propertyKind: "first_home",
      propertyValue: 1850000,
      remainingMortgage: 620000,
      newLoanAmount: 400000,
      newLoanMonthlyPayment: 4500,
    },
  },
  {
    name: "מרים דהן",
    input: {
      netIncome: 15000,
      existingMonthlyRepayments: 0,
      assetType: "none",
      newLoanMonthlyPayment: 5100,
    },
  },
  {
    name: "עומר שלו",
    pulledBy: "מימון ישיר",
    input: {
      netIncome: 18000,
      existingMonthlyRepayments: 1200,
      assetType: "car",
      newLoanMonthlyPayment: 5600,
    },
  },
  {
    name: "נועה גל",
    input: {
      netIncome: 12000,
      existingMonthlyRepayments: 1500,
      assetType: "none",
      newLoanMonthlyPayment: 2000,
    },
  },
  {
    name: "רון כץ",
    input: {
      netIncome: 28000,
      existingMonthlyRepayments: 0,
      assetType: "property",
      propertyKind: "investment",
      propertyValue: 2100000,
      remainingMortgage: 0,
      newLoanAmount: 850000,
      newLoanMonthlyPayment: 4980,
    },
  },
];

const NAV = [
  { icon: "🗂️", label: "הלקוחות שלי", active: true },
  { icon: "➕", label: "לקוח חדש" },
  { icon: "🏦", label: "הצעות שהתקבלו" },
  { icon: "📊", label: "דוחות" },
];

export default function DashboardPage() {
  const rows = SAMPLE.map((r) => ({ ...r, dti: computeDti(r.input) }));
  const hot = rows.filter((r) => r.dti.status === "hot").length;

  return (
    <div className="min-h-screen flex">
      {/* sidebar */}
      <aside className="w-60 shrink-0 p-4 flex flex-col border-l border-[color:var(--color-line)] bg-[linear-gradient(180deg,#0b1830,#0a1424)]">
        <Logo size="sm" className="mb-6" />
        {NAV.map((n) => (
          <div
            key={n.label}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 ${
              n.active
                ? "fh-badge-gold !rounded-lg font-bold"
                : "text-muted"
            }`}
          >
            <span className="w-4 text-center">{n.icon}</span>
            {n.label}
          </div>
        ))}
        <div className="mt-auto">
          <span className="fh-badge fh-badge-good">דנה לוי · מתווך</span>
        </div>
      </aside>

      {/* main */}
      <main className="flex-1 p-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">הלקוחות שלי</h1>
            <p className="text-muted text-sm mt-1">
              {rows.length} לקוחות · {hot} לוהטים 🔥 · יחס החזר לפי כללי בנק ישראל
            </p>
          </div>
          <button className="fh-btn-gold">+ לקוח חדש</button>
        </header>

        <div className="fh-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gold text-xs uppercase tracking-wide">
                <th className="text-right font-bold px-4 py-3 border-b border-[color:var(--color-line)]">לקוח</th>
                <th className="text-right font-bold px-4 py-3 border-b border-[color:var(--color-line)]">בטוחה</th>
                <th className="text-right font-bold px-4 py-3 border-b border-[color:var(--color-line)]">יחס החזר (PTI)</th>
                <th className="text-right font-bold px-4 py-3 border-b border-[color:var(--color-line)]">LTV</th>
                <th className="text-right font-bold px-4 py-3 border-b border-[color:var(--color-line)]">סטטוס</th>
                <th className="text-right font-bold px-4 py-3 border-b border-[color:var(--color-line)]">נמשך ע&quot;י</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">
                    {r.input.assetType === "property" ? (
                      <span className="fh-badge fh-badge-gold">נכס</span>
                    ) : r.input.assetType === "car" ? (
                      <span className="fh-badge fh-badge-gold">רכב</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.dti.ptiPct}%</td>
                  <td className="px-4 py-3">
                    {r.dti.ltvPct != null ? `${r.dti.ltvPct}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`fh-badge ${statusBadgeClass(r.dti.status)}`}>
                      {r.dti.statusLabel}
                    </span>
                    {r.dti.cta && (
                      <span className="block text-[11px] text-muted mt-1">
                        {r.dti.cta}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{r.pulledBy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted text-xs mt-4">
          * הסטטוסים מחושבים חיים על-ידי מנוע ה-DTI ב-
          <code className="text-gold-light">src/lib/dti.ts</code> (PTI + LTV + חוק
          עוקף). חיבור ל-Supabase ולנתונים אמיתיים — השלב הבא.
        </p>
      </main>
    </div>
  );
}
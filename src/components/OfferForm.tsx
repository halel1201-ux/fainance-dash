"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { monthlyPayment, primeToAnnualPct } from "@/lib/dti";

export default function OfferForm({
  clientId,
  existing,
}: {
  clientId: string;
  existing?: { amount: number; prime_delta: number; term_months: number; status: string } | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(existing?.amount ? String(existing.amount) : "");
  const [primeDelta, setPrimeDelta] = useState(
    existing?.prime_delta != null ? String(existing.prime_delta) : "-0.5"
  );
  const [term, setTerm] = useState(existing?.term_months ? String(existing.term_months) : "120");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const a = Number(amount) || 0;
  const pd = Number(primeDelta) || 0;
  const t = Number(term) || 0;
  const preview = a && t ? Math.round(monthlyPayment(a, primeToAnnualPct(pd), t)) : 0;

  async function send(action: "offer" | "reject") {
    setError(null);
    setOk(null);
    setBusy(true);
    const res = await fetch("/api/banker/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        action,
        amount: a,
        prime_delta: pd,
        term_months: t,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "הפעולה נכשלה");
      return;
    }
    setOk(action === "reject" ? "הלקוח נדחה והיועץ עודכן" : "ההצעה נשלחה והיועץ עודכן");
    router.refresh();
  }

  return (
    <div className="fh-card p-6 max-w-xl">
      <h3 className="font-bold mb-4">
        {existing?.status === "offered" ? "עדכון ההצעה שלי" : "מתן הצעת מימון"}
      </h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="fh-label">סכום גיוס (₪)</label>
          <input type="number" dir="ltr" className="fh-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="fh-label">ריבית פריים ±</label>
          <input type="number" step="0.05" dir="ltr" className="fh-input" value={primeDelta} onChange={(e) => setPrimeDelta(e.target.value)} />
        </div>
        <div>
          <label className="fh-label">פריסה (חודשים)</label>
          <input type="number" dir="ltr" className="fh-input" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 fh-card p-3 bg-[rgba(63,174,122,.08)] text-sm flex justify-between">
        <span className="text-muted">החזר חודשי משוער</span>
        <span className="font-bold text-gold">
          {preview ? "₪" + preview.toLocaleString("he-IL") : "—"}
        </span>
      </div>

      {error && <p className="text-sm mt-3" style={{ color: "var(--color-hot)" }}>{error}</p>}
      {ok && <p className="text-sm mt-3" style={{ color: "var(--color-good)" }}>{ok}</p>}

      <div className="flex gap-3 mt-5">
        <button disabled={busy} onClick={() => send("offer")} className="fh-btn-gold disabled:opacity-60">
          {busy ? "שולח…" : existing?.status === "offered" ? "עדכן הצעה" : "שלח הצעה"}
        </button>
        <button disabled={busy} onClick={() => send("reject")} className="fh-btn-ghost disabled:opacity-60">
          דחה לקוח
        </button>
      </div>
    </div>
  );
}
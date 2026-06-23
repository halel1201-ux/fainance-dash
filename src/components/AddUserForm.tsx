"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Bank = { id: string; name: string };

const ROLES = [
  { value: "broker", label: "מתווך" },
  { value: "banker", label: "בנקאי" },
  { value: "nonbank", label: "חוץ-בנקאי" },
  { value: "admin", label: "אדמין" },
] as const;

export default function AddUserForm({ banks }: { banks: Bank[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "broker",
    bank_id: "",
    branch_area: "",
  });

  const needsBank = form.role === "banker" || form.role === "nonbank";

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, bank_id: needsBank ? form.bank_id : null }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "שמירה נכשלה");
      return;
    }
    setOk(`המשתמש ${form.full_name} נוצר בהצלחה`);
    setForm({ full_name: "", email: "", password: "", role: "broker", bank_id: "", branch_area: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button className="fh-btn-gold" onClick={() => setOpen(true)}>
        + הוסף משתמש
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="fh-card p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">משתמש חדש</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-muted text-sm">
          ✕
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="fh-label">שם מלא *</label>
          <input className="fh-input" required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div>
          <label className="fh-label">תפקיד *</label>
          <select className="fh-input" value={form.role} onChange={(e) => set("role", e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="fh-label">אימייל *</label>
          <input type="email" dir="ltr" className="fh-input" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="fh-label">סיסמה ראשונית *</label>
          <input type="text" dir="ltr" className="fh-input" required value={form.password} onChange={(e) => set("password", e.target.value)} />
        </div>
        {needsBank && (
          <>
            <div>
              <label className="fh-label">שיוך לבנק *</label>
              <select className="fh-input" required value={form.bank_id} onChange={(e) => set("bank_id", e.target.value)}>
                <option value="">— בחר בנק —</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="fh-label">אזור / סניף *</label>
              <input className="fh-input" required placeholder="למשל: באר שבע" value={form.branch_area} onChange={(e) => set("branch_area", e.target.value)} />
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm mt-4" style={{ color: "var(--color-hot)" }}>{error}</p>}
      {ok && <p className="text-sm mt-4" style={{ color: "var(--color-good)" }}>{ok}</p>}

      <div className="flex gap-3 mt-6">
        <button type="submit" disabled={saving} className="fh-btn-gold disabled:opacity-60">
          {saving ? "יוצר…" : "צור משתמש"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="fh-btn-ghost">
          סגור
        </button>
      </div>
    </form>
  );
}
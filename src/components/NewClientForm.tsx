"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewClientForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    national_id: "",
    net_income: "",
    fixed_expenses: "",
    total_obligo: "",
    monthly_repay: "",
    has_rent: false,
    rent_amount: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("פג תוקף ההתחברות");
      setSaving(false);
      return;
    }

    const num = (s: string) => (s === "" ? 0 : Number(s));
    const { error } = await supabase.from("clients").insert({
      broker_id: user.id,
      full_name: form.full_name,
      phone: form.phone || null,
      national_id: form.national_id || null,
      net_income: num(form.net_income),
      fixed_expenses: num(form.fixed_expenses),
      total_obligo: num(form.total_obligo),
      monthly_repay: num(form.monthly_repay),
      has_rent: form.has_rent,
      rent_amount: form.has_rent ? num(form.rent_amount) : 0,
    });

    setSaving(false);
    if (error) {
      setError("שמירה נכשלה: " + error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="fh-card p-6 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="שם מלא *">
          <input
            required
            className="fh-input"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
        </Field>
        <Field label="טלפון">
          <input
            className="fh-input"
            dir="ltr"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label='ת"ז'>
          <input
            className="fh-input"
            dir="ltr"
            value={form.national_id}
            onChange={(e) => set("national_id", e.target.value)}
          />
        </Field>
        <Field label="הכנסה חודשית נטו (₪)">
          <input
            type="number"
            className="fh-input"
            dir="ltr"
            value={form.net_income}
            onChange={(e) => set("net_income", e.target.value)}
          />
        </Field>
        <Field label="הוצאות קבועות (₪)">
          <input
            type="number"
            className="fh-input"
            dir="ltr"
            value={form.fixed_expenses}
            onChange={(e) => set("fixed_expenses", e.target.value)}
          />
        </Field>
        <Field label="אובליגו — יתרת חוב כוללת (₪)">
          <input
            type="number"
            className="fh-input"
            dir="ltr"
            value={form.total_obligo}
            onChange={(e) => set("total_obligo", e.target.value)}
          />
        </Field>
        <Field label="החזר חודשי קיים (₪)">
          <input
            type="number"
            className="fh-input"
            dir="ltr"
            value={form.monthly_repay}
            onChange={(e) => set("monthly_repay", e.target.value)}
          />
        </Field>
        <Field label="שכירות?">
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.has_rent}
                onChange={(e) => set("has_rent", e.target.checked)}
              />
              כן
            </label>
            {form.has_rent && (
              <input
                type="number"
                placeholder="סכום ₪"
                className="fh-input flex-1"
                dir="ltr"
                value={form.rent_amount}
                onChange={(e) => set("rent_amount", e.target.value)}
              />
            )}
          </div>
        </Field>
      </div>

      {error && (
        <p className="text-sm mt-4" style={{ color: "var(--color-hot)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button type="submit" disabled={saving} className="fh-btn-gold disabled:opacity-60">
          {saving ? "שומר…" : "שמירת לקוח"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="fh-btn-ghost"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="fh-label">{label}</label>
      {children}
    </div>
  );
}
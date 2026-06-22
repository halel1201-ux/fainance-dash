"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddBankForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isNonbank, setIsNonbank] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { error } = await createClient()
      .from("banks")
      .insert({ name, is_nonbank: isNonbank });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setIsNonbank(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[180px]">
        <label className="fh-label">שם בנק / גוף</label>
        <input className="fh-input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm pb-2">
        <input type="checkbox" checked={isNonbank} onChange={(e) => setIsNonbank(e.target.checked)} />
        חוץ-בנקאי
      </label>
      <button type="submit" disabled={saving} className="fh-btn-ghost disabled:opacity-60">
        {saving ? "מוסיף…" : "+ הוסף בנק"}
      </button>
      {error && <p className="w-full text-sm" style={{ color: "var(--color-hot)" }}>{error}</p>}
    </form>
  );
}
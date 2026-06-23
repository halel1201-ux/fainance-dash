"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type BankerOption = {
  id: string;
  full_name: string;
  bank_name: string;
  branch_area: string | null;
};

export default function ShareClient({
  clientId,
  bankers,
  sharedIds,
}: {
  clientId: string;
  bankers: BankerOption[];
  sharedIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shared = new Set(sharedIds);

  async function toggle(bankerId: string, on: boolean) {
    setError(null);
    setBusy(bankerId);
    const supabase = createClient();
    if (on) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("client_shares")
        .insert({ client_id: clientId, banker_id: bankerId, shared_by: user!.id });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase
        .from("client_shares")
        .delete()
        .eq("client_id", clientId)
        .eq("banker_id", bankerId);
      if (error) setError(error.message);
    }
    setBusy(null);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="fh-btn-gold" onClick={() => setOpen(true)}>
        🔗 שתף לקוח עם בנקאים {sharedIds.length > 0 ? `(${sharedIds.length})` : ""}
      </button>
    );
  }

  return (
    <div className="fh-card p-5 max-w-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">שיתוף לקוח עם בנקאים</h3>
        <button onClick={() => setOpen(false)} className="text-muted text-sm">✕</button>
      </div>
      {bankers.length === 0 && (
        <p className="text-muted text-sm">אין בנקאים במערכת. בקש מהאדמין להוסיף.</p>
      )}
      <div className="space-y-1 max-h-80 overflow-auto">
        {bankers.map((b) => {
          const on = shared.has(b.id);
          return (
            <label
              key={b.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={on}
                disabled={busy === b.id}
                onChange={(e) => toggle(b.id, e.target.checked)}
              />
              <span className="text-sm">
                <b>{b.full_name}</b> · {b.bank_name}
                {b.branch_area ? (
                  <span className="text-muted"> ({b.branch_area})</span>
                ) : null}
              </span>
              {on && <span className="fh-badge fh-badge-good mr-auto">משותף</span>}
            </label>
          );
        })}
      </div>
      {error && <p className="text-sm mt-3" style={{ color: "var(--color-hot)" }}>{error}</p>}
      <button onClick={() => setOpen(false)} className="fh-btn-ghost mt-4">סיום</button>
    </div>
  );
}
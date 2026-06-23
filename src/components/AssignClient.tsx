"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Advisor = { id: string; full_name: string };

export default function AssignClient({
  clientId,
  current,
  advisors,
}: {
  clientId: string;
  current: string;
  advisors: Advisor[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    setError(null);
    setBusy(true);
    setValue(next);
    const { error } = await createClient()
      .from("clients")
      .update({ broker_id: next })
      .eq("id", clientId);
    setBusy(false);
    if (error) {
      setError(error.message);
      setValue(current);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <select
        className="fh-input !py-1.5 text-xs"
        disabled={busy}
        value={value}
        onChange={(e) => change(e.target.value)}
      >
        {advisors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px]" style={{ color: "var(--color-hot)" }}>{error}</p>}
    </div>
  );
}
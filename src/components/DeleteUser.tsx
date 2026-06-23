"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteUser({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`למחוק את ${name}? פעולה זו אינה הפיכה.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(json.error ?? "המחיקה נכשלה");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-xs disabled:opacity-50"
      style={{ color: "var(--color-hot)" }}
      title="מחק משתמש"
    >
      {busy ? "מוחק…" : "🗑 מחק"}
    </button>
  );
}
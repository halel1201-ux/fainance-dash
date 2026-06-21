"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError("אימייל או סיסמה שגויים");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
      <div>
        <label className="fh-label">דוא&quot;ל</label>
        <input
          type="email"
          required
          dir="ltr"
          className="fh-input"
          placeholder="name@bank.co.il"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="fh-label">סיסמה</label>
        <input
          type="password"
          required
          className="fh-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm" style={{ color: "var(--color-hot)" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="fh-btn-gold w-full !py-3 disabled:opacity-60">
        {loading ? "מתחבר…" : "כניסה למערכת ←"}
      </button>
    </form>
  );
}
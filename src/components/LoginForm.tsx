"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function translateAuthError(code?: string, message?: string): string {
  switch (code) {
    case "invalid_credentials":
      return "אימייל או סיסמה שגויים";
    case "email_not_confirmed":
      return "המייל לא אומת — אשר אותו במייל שנשלח, או דרך הדאשבורד";
    case "user_not_found":
      return "משתמש לא קיים";
    case "over_request_rate_limit":
      return "יותר מדי ניסיונות — נסה שוב בעוד רגע";
    default:
      return message ? `שגיאת התחברות: ${message}` : "שגיאת התחברות";
  }
}

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
      setError(translateAuthError(error.code, error.message));
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
      <button
        type="submit"
        disabled={loading}
        className="fh-btn-gold w-full !py-3 disabled:opacity-60"
      >
        {loading ? "מתחבר…" : "כניסה למערכת ←"}
      </button>
    </form>
  );
}
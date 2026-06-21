import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import { getProfile } from "@/lib/auth";

export default async function LoginPage() {
  const profile = await getProfile();
  if (profile) redirect("/dashboard");

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* form side */}
      <section className="flex flex-col justify-center px-8 sm:px-16 py-12">
        <Logo size="lg" className="mb-10" />

        <p className="text-gold text-sm font-bold tracking-[0.3em] mb-2">
          ברוך שובך
        </p>
        <h1 className="text-3xl font-black mb-8">התחברות למערכת</h1>

        <LoginForm />

        <p className="text-muted text-xs mt-5 max-w-sm">
          הגישה לפי תפקיד שהוגדר על-ידי האדמין. שכחת סיסמה? פנה למנהל המערכת.
        </p>
      </section>

      {/* brand side */}
      <section className="hidden lg:flex flex-col justify-center px-16 border-r border-[color:var(--color-line)] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(600px 320px at 70% 18%, rgba(200,164,92,.16), transparent)",
          }}
        />
        <span className="fh-badge fh-badge-gold mb-6 w-fit">פלטפורמה מאובטחת</span>
        <h2 className="text-4xl font-black leading-tight">
          ניהול מימון
          <br />
          <span className="text-gold">מקצה לקצה</span>
        </h2>
        <p className="text-muted mt-4 max-w-md leading-relaxed">
          מאגר לקוחות חכם · מנוע יחס החזר (PTI/LTV) לפי כללי בנק ישראל · הצעות
          מימון מתחרות במקום אחד.
        </p>
        <div className="flex gap-8 mt-8">
          <Stat n="4" t="תפקידים" />
          <Stat n="∞" t="לקוחות במאגר" />
          <Stat n="P±" t="תמחור ריבית" />
        </div>
      </section>
    </main>
  );
}

function Stat({ n, t }: { n: string; t: string }) {
  return (
    <div>
      <div className="text-2xl font-black text-gold">{n}</div>
      <div className="text-xs text-muted">{t}</div>
    </div>
  );
}
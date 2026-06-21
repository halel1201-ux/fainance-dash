import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import NewClientForm from "@/components/NewClientForm";

export default async function NewClientPage() {
  const profile = await getProfile();
  if (!profile) redirect("/");
  if (profile.role !== "broker" && profile.role !== "admin") {
    return (
      <main className="p-8">
        <p className="text-muted">רק מתווך יכול להוסיף לקוח חדש.</p>
        <Link href="/dashboard" className="text-gold-light underline">
          ← חזרה
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <Link href="/dashboard" className="text-muted text-sm hover:text-gold-light">
        ← חזרה לדשבורד
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-6">לקוח חדש</h1>
      <NewClientForm />
    </main>
  );
}
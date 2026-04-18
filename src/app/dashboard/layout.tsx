import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/ui/Navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: p } = await supabase
    .from("perfiles")
    .select("nombre, apellido")
    .eq("id", user.id)
    .single();
  return (
    <div className="min-h-screen bg-background">
      <Navbar
        nombre={p?.nombre ?? undefined}
        apellido={p?.apellido ?? undefined}
        email={user.email}
      />
      <main className="container py-6 pb-24 sm:pb-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}

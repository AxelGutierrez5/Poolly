"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { Avatar, AvatarFallback } from "./avatar";
import { cn } from "@/lib/utils";
import { LayoutGrid, User, Coins, LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Grupos", icon: LayoutGrid },
  { href: "/perfil", label: "Perfil", icon: User },
];

interface NavbarProps {
  nombre?: string;
  apellido?: string;
  email?: string;
}

export default function Navbar({
  nombre: initialNombre,
  apellido: initialApellido,
  email,
}: NavbarProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [nombre, setNombre] = useState(initialNombre || "");
  const [apellido, setApellido] = useState(initialApellido || "");

  // RealTime — escucha cambios en perfiles para reflejar nombre actualizado al instante
  // useEffect(() => {
  //   let channel: ReturnType<typeof supabase.channel> | null = null

  //   supabase.auth.getUser().then(({ data: { user } }) => {
  //     if (!user) return
  //     // .on() y .subscribe() deben encadenarse en una sola expresión
  //     channel = supabase
  //       .channel(`navbar-perfil-${user.id}`)
  //       .on('postgres_changes', {
  //         event: 'UPDATE', schema: 'public', table: 'perfiles',
  //         filter: `id=eq.${user.id}`,
  //       }, (payload: any) => {
  //         setNombre(payload.new.nombre || '')
  //         setApellido(payload.new.apellido || '')
  //       })
  //       .subscribe()
  //   })

  //   return () => {
  //     if (channel) supabase.removeChannel(channel)
  //   }
  // }, [])

  const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ").trim();
  const displayName = nombreCompleto || email?.split("@")[0] || "Usuario";
  const initials = (nombre || email || "U").charAt(0).toUpperCase();

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Coins className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base tracking-tight">Poolly</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1 flex-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop right */}
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            <Link
              href="/soporte"
              title="Soporte"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === "/soporte"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <LifeBuoy className="h-4 w-4" />
              <span className="hidden lg:inline">Soporte</span>
            </Link>
            <div className="flex items-center gap-2 px-2 py-1 rounded-md">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground max-w-[180px] truncate">
                {displayName}
              </span>
            </div>
            <ThemeToggle />
          </div>

          {/* Mobile right */}
          <div className="sm:hidden ml-auto flex items-center gap-1">
            <Link
              href="/soporte"
              className={cn(
                "p-2 rounded-md transition-colors",
                pathname === "/soporte"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LifeBuoy className="h-5 w-5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Bottom nav mobile ─────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-16">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
                style={{
                  color: active
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground))",
                }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

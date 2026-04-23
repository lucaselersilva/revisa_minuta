"use client";

import { BarChart3, BriefcaseBusiness, FolderKanban, Scale, Settings, Tags, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

const navigation = [
  { href: "/app", label: "Dashboard", icon: BarChart3, role: "all" },
  { href: "/app/cases", label: "Processos", icon: BriefcaseBusiness, role: "all" },
  { href: "/app/admin/taxonomies", label: "Taxonomias", icon: Tags, role: "admin" },
  { href: "/app/admin/users", label: "Usuarios", icon: Users, role: "admin" },
  { href: "/app/settings/profile", label: "Perfil", icon: Settings, role: "all" }
] as const;

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const items = navigation.filter((item) => item.role === "all" || profile.role === item.role);

  return (
    <aside className="hidden w-72 shrink-0 border-r bg-white/88 px-4 py-5 backdrop-blur xl:block">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Revisa Minuta</p>
            <p className="text-xs text-muted-foreground">Abrahao Advogados</p>
          </div>
        </div>

        <div className="mt-7 rounded-lg border bg-muted/45 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase text-muted-foreground">Workspace</p>
            <Badge variant={profile.role === "admin" ? "success" : "secondary"}>
              {profile.role === "admin" ? "Admin" : "Lawyer"}
            </Badge>
          </div>
          <p className="mt-2 truncate text-sm font-medium">{profile.full_name ?? "Usuario interno"}</p>
        </div>

        <nav className="mt-6 space-y-1">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <FolderKanban className="h-4 w-4 text-accent" />
            MVP Fundacao
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Autenticacao, taxonomias, usuarios e estrutura segura para os proximos fluxos juridicos.
          </p>
        </div>
      </div>
    </aside>
  );
}

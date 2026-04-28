import { LogOut, ShieldCheck } from "lucide-react";

import { signOutAction } from "@/features/auth/actions/sign-out";

import { Button } from "../ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/88 px-5 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Ambiente autenticado
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Operacao multi-carteira, com base preparada para expansao juridica por cliente.
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}

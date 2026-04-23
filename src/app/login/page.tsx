import { Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-15 premium-grid" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/12">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Revisa Minuta</p>
            <p className="text-sm text-primary-foreground/72">Fundacao IA juridica B2B</p>
          </div>
        </div>

        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1 text-sm">
            <Sparkles className="h-4 w-4 text-accent" />
            Plataforma privada Abrahao Advogados
          </div>
          <h1 className="text-5xl font-semibold leading-tight tracking-normal">
            Revisao processual com base tecnica, controle e evolucao segura.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/76">
            Esta fase entrega a arquitetura, autenticação, governanca inicial de usuarios e taxonomias para preparar o fluxo juridico assistido por IA.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {["Supabase Auth", "RLS por office", "Taxonomias"].map((item) => (
            <div key={item} className="rounded-lg border border-white/15 bg-white/10 p-4 text-sm backdrop-blur">
              <ShieldCheck className="mb-3 h-4 w-4 text-accent" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-semibold">Revisa Minuta</h1>
          </div>

          <div className="rounded-lg border bg-white p-7 shadow-premium">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase text-primary">Acesso interno</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">Entrar na plataforma</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use as credenciais criadas no Supabase Auth. Convites novos devem ser ativados pelo link recebido por e-mail.
              </p>
            </div>
            <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-muted" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Loader2, LockKeyhole, MailCheck, UserRound } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { acceptInviteAction, getInviteAcceptanceStateAction } from "@/features/users/actions/invite-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { acceptInviteSchema, type AcceptInviteInput } from "@/lib/validations/users";

type InviteState =
  | { ready: false; error: string | null }
  | {
      ready: true;
      status: "pending" | "accepted";
      email: string;
      role: "admin" | "lawyer";
      fullName: string;
    };

const allowedInviteTypes = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function clearInviteParams() {
  window.history.replaceState({}, document.title, "/auth/complete-invite");
}

async function hydrateInviteSessionFromUrl() {
  const supabase = createClient();
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const code = searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      clearInviteParams();
      return { ok: true as const, error: null };
    }

    return { ok: false as const, error: error.message };
  }

  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const type = typeParam && allowedInviteTypes.has(typeParam as EmailOtpType) ? (typeParam as EmailOtpType) : null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash
    });

    if (!error) {
      clearInviteParams();
      return { ok: true as const, error: null };
    }

    return { ok: false as const, error: error.message };
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (!error) {
      clearInviteParams();
      return { ok: true as const, error: null };
    }

    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, error: null };
}

export function AcceptInviteForm() {
  const router = useRouter();
  const [inviteState, setInviteState] = useState<InviteState>({ ready: false, error: null });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      fullName: "",
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    let isMounted = true;

    async function loadInviteState() {
      const hydrationResult = await hydrateInviteSessionFromUrl();

      if (!hydrationResult.ok) {
        setInviteState({ ready: false, error: hydrationResult.error ?? "Nao foi possivel validar o link do convite." });
        return;
      }

      const supabase = createClient();
      await supabase.auth.getSession();

      const result = await getInviteAcceptanceStateAction();

      if (!isMounted) {
        return;
      }

      if (!result.ok) {
        setInviteState({ ready: false, error: result.message ?? "Convite indisponivel." });
        return;
      }

      if (result.status === "accepted") {
        router.replace("/app");
        router.refresh();
        return;
      }

      setInviteState({
        ready: true,
        status: result.status ?? "pending",
        email: result.email ?? "",
        role: result.role ?? "lawyer",
        fullName: result.fullName ?? ""
      });

      form.reset({
        fullName: result.fullName ?? "",
        password: "",
        confirmPassword: ""
      });
    }

    loadInviteState();

    return () => {
      isMounted = false;
    };
  }, [form, router]);

  function onSubmit(values: AcceptInviteInput) {
    setGlobalError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateUserError } = await supabase.auth.updateUser({
        password: values.password,
        data: {
          full_name: values.fullName
        }
      });

      if (updateUserError) {
        setGlobalError("Nao foi possivel definir a senha do convite.");
        return;
      }

      const result = await acceptInviteAction(values);

      if (!result.ok) {
        setGlobalError(result.message);
        return;
      }

      router.replace("/app");
      router.refresh();
    });
  }

  if (!inviteState.ready && !inviteState.error) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Preparando convite</CardTitle>
          <CardDescription>Estamos validando sua sessao de convite e carregando os dados de acesso.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validando convite...
        </CardContent>
      </Card>
    );
  }

  if (!inviteState.ready) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Convite indisponivel</CardTitle>
          <CardDescription>Este link nao esta mais valido ou nao ha um convite pendente para a sua sessao.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{inviteState.error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Concluir convite</CardTitle>
        <CardDescription>Defina sua senha inicial e confirme os dados para ativar o acesso interno.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/25 p-3">
            <p className="text-xs uppercase text-muted-foreground">E-mail</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              <MailCheck className="h-4 w-4 text-primary" />
              {inviteState.email}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/25 p-3">
            <p className="text-xs uppercase text-muted-foreground">Perfil</p>
            <div className="mt-1">
              <Badge variant={inviteState.role === "admin" ? "success" : "secondary"}>{inviteState.role}</Badge>
            </div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="fullName" className="pl-9" placeholder="Nome completo" {...form.register("fullName")} />
            </div>
            {form.formState.errors.fullName ? (
              <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha inicial</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" className="pl-9" placeholder="Crie uma senha segura" {...form.register("password")} />
            </div>
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword ? (
              <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
            ) : null}
          </div>

          {globalError ? (
            <div className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {globalError}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            Ativar acesso
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { FileUp, Loader2, PencilLine, ShieldCheck } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CaseForm } from "@/features/cases/components/case-form";
import { createCaseFromUploadAction } from "@/features/cases/actions/case-actions";
import type { CaseSelectOptions } from "@/features/cases/types";
import type { Profile } from "@/types/database";

type IntakeMode = "manual" | "upload";

export function NewCaseEntry({
  options,
  profile
}: {
  options: CaseSelectOptions;
  profile: Profile;
}) {
  const [mode, setMode] = useState<IntakeMode>("manual");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ModeCard
          active={mode === "manual"}
          icon={PencilLine}
          title="Cadastro manual"
          description="Fluxo tradicional para preencher todos os campos desde o inicio."
          detail="Indicado quando o time ja tem os dados do processo organizados."
          onSelect={() => setMode("manual")}
        />
        <ModeCard
          active={mode === "upload"}
          icon={FileUp}
          title="Cadastro por upload"
          description="Envie a peticao inicial e deixe o sistema preencher o cadastro base com os dados identificados."
          detail="Depois voce revisa, ajusta o que precisar e segue o fluxo normal."
          onSelect={() => setMode("upload")}
        />
      </div>

      {mode === "manual" ? <CaseForm options={options} canManageEntities={profile.role === "admin"} /> : <CreateCaseFromUploadCard profile={profile} />}
    </div>
  );
}

function ModeCard({
  active,
  icon: Icon,
  title,
  description,
  detail,
  onSelect
}: {
  active: boolean;
  icon: typeof FileUp;
  title: string;
  description: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-2xl border bg-white p-0 text-left shadow-sm transition-all",
        active ? "border-primary ring-2 ring-primary/15" : "border-slate-200 hover:border-slate-300"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <Icon className="h-5 w-5" />
            </div>
            {active ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Selecionado</span> : null}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="px-6 py-4 text-sm leading-6 text-slate-500">{detail}</div>
      </div>
    </button>
  );
}

function CreateCaseFromUploadCard({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState(createCaseFromUploadAction, null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.ok === false) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Cadastro por upload</CardTitle>
        <CardDescription>
          Envie de preferencia a peticao inicial. O sistema vai criar o processo, persistir o arquivo como documento inicial, preencher os campos que conseguir identificar e abrir a tela de revisao para voce confirmar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            className="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5"
            action={formAction}
          >
            <div className="space-y-2">
              <Label htmlFor="case-intake-file">Arquivo base</Label>
              <Input
                id="case-intake-file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
                onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? null)}
              />
              <p className="text-sm text-slate-500">
                Formatos aceitos: PDF, imagem, TXT, DOC e DOCX. PDF e imagem costumam trazer a melhor extração inicial.
              </p>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Responsavel inicial</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{profile.full_name ?? "Usuario interno"}</p>
              <p className="mt-1 text-sm text-slate-500">O processo ja nasce vinculado ao usuario logado como advogado responsavel.</p>
            </div>

            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Criar processo a partir do upload
            </Button>
          </form>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-5">
              <div className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="font-semibold">O que o sistema tenta preencher</p>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Titulo operacional do caso</p>
                <p>Numero do processo, quando constar no documento</p>
                <p>Empresa representada que esta sendo demandada</p>
                <p>CNPJ ou documento da empresa, quando identificado</p>
                <p>Autores identificados na peticao inicial</p>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="font-semibold text-slate-900">Depois do upload</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>O arquivo ja fica salvo como documento do processo.</p>
                <p>Voce e levado para a tela de edicao com os dados pre-preenchidos.</p>
                <p>Ali voce revisa, corrige o que precisar e segue com o fluxo normal.</p>
              </div>
              {selectedFileName ? (
                <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Arquivo selecionado: <span className="font-medium">{selectedFileName}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
